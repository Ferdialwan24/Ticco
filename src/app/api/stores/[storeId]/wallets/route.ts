import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Wallet from '@/models/Wallet';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'GET');
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    await connectToDatabase();
    const wallets = await Wallet.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      isArchived: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    const formatted = wallets.map((w) => ({
      id: w._id.toString(),
      name: w.name,
      type: w.type || 'cash',
      bankCode: w.bankCode || null,
      accountNumber: w.accountNumber || '',
      balance: w.balance,
      isArchived: w.isArchived,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({ wallets: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const name = body.name?.trim();
    const type = ['cash', 'bank', 'ewallet'].includes(body.type) ? body.type : 'cash';
    const bankCode = body.bankCode?.trim() || null;
    const accountNumber = body.accountNumber?.trim() || '';
    const initialBalance = Number(body.initialBalance) || 0;

    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama dompet wajib diisi (2 - 50 karakter).' },
        { status: 400 }
      );
    }

    if (type === 'bank' && !bankCode) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Pilihan bank wajib ditentukan untuk rekening bank.' },
        { status: 400 }
      );
    }

    if (initialBalance < 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Saldo awal dompet tidak boleh negatif.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newWallet = await Wallet.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      name,
      type,
      bankCode,
      accountNumber,
      balance: initialBalance,
    });

    return NextResponse.json(
      {
        success: true,
        wallet: {
          id: newWallet._id.toString(),
          name: newWallet.name,
          type: newWallet.type,
          bankCode: newWallet.bankCode,
          accountNumber: newWallet.accountNumber,
          balance: newWallet.balance,
          isArchived: newWallet.isArchived,
          createdAt: newWallet.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
