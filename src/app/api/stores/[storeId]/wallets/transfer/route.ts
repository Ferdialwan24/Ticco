import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { fromWalletId, toWalletId, amount, date, notes, adminFee = 0, adminFeeMethod } = body;

    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal transfer harus lebih besar dari 0.' },
        { status: 400 }
      );
    }

    const fee = Math.max(0, Number(adminFee) || 0);
    const totalDeduction = transferAmount + fee;

    if (!fromWalletId || !toWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet asal dan tujuan wajib dipilih.' },
        { status: 400 }
      );
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet asal dan tujuan tidak boleh sama.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const fromObjId = new mongoose.Types.ObjectId(fromWalletId);
    const toObjId = new mongoose.Types.ObjectId(toWalletId);
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    const destWallet = await Wallet.findOne({
      _id: toObjId,
      storeId: storeObjId,
      isArchived: false,
    });
    if (!destWallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    const debitResult = await Wallet.updateOne(
      {
        _id: fromObjId,
        storeId: storeObjId,
        isArchived: false,
        balance: { $gte: totalDeduction },
      },
      { $inc: { balance: -totalDeduction } }
    );

    if (debitResult.modifiedCount === 0) {
      const sourceWallet = await Wallet.findOne({ _id: fromObjId, storeId: storeObjId });
      if (!sourceWallet) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Dompet asal tidak ditemukan.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'UnprocessableEntity',
          message: `Saldo ${sourceWallet.name} tidak mencukupi untuk transfer Rp ${transferAmount.toLocaleString('id-ID')}${fee > 0 ? ` + admin Rp ${fee.toLocaleString('id-ID')}` : ''} (Saldo saat ini: Rp ${sourceWallet.balance.toLocaleString('id-ID')}).`,
        },
        { status: 422 }
      );
    }

    const creditResult = await Wallet.updateOne(
      { _id: toObjId, storeId: storeObjId },
      { $inc: { balance: transferAmount } }
    );

    if (creditResult.modifiedCount === 0) {
      await Wallet.updateOne(
        { _id: fromObjId, storeId: storeObjId },
        { $inc: { balance: totalDeduction } }
      );
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Gagal mengkredit dompet tujuan. Transaksi dibatalkan.' },
        { status: 500 }
      );
    }

    const txDate = date ? new Date(date) : new Date();

    const transferTx = await Transaction.create({
      storeId: storeObjId,
      walletId: fromObjId,
      destinationWalletId: toObjId,
      type: 'transfer',
      category: 'Transfer Antar-Dompet',
      amount: transferAmount,
      adminFee: fee,
      date: txDate,
      notes: notes?.trim() || `Transfer dana internal ke ${destWallet.name}${fee > 0 ? ` (Biaya Admin Rp ${fee.toLocaleString('id-ID')})` : ''}`,
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    if (fee > 0) {
      await Transaction.create({
        storeId: storeObjId,
        walletId: fromObjId,
        type: 'expense',
        category: 'Biaya Administrasi Bank',
        amount: fee,
        date: txDate,
        notes: `Biaya transfer (${adminFeeMethod || 'Transfer Antar-Bank'}) ke ${destWallet.name}`,
        recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer antar-dompet berhasil dilakukan.',
      transaction: {
        id: transferTx._id.toString(),
        amount: transferTx.amount,
        adminFee: fee,
        fromWalletId,
        toWalletId,
        date: transferTx.date,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
