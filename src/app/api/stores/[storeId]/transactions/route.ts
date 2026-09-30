import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Transaction from '@/models/Transaction';
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const walletId = searchParams.get('walletId');
    const type = searchParams.get('type');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    const query: any = { storeId: storeObjId };

    if (type && ['income', 'expense', 'transfer'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (walletId && mongoose.Types.ObjectId.isValid(walletId)) {
      query.walletId = new mongoose.Types.ObjectId(walletId);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(query)
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .populate<{ destinationWalletId?: { _id: mongoose.Types.ObjectId; name: string } }>('destinationWalletId')
      .populate<{ recordedBy: { _id: mongoose.Types.ObjectId; name: string } }>('recordedBy')
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const summaryFilter = { ...query };
    delete summaryFilter.type;

    const allInFilter = await Transaction.find({
      ...summaryFilter,
      type: { $in: ['income', 'expense'] },
    }).lean();

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of allInFilter) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }
    }

    const netCashFlow = totalIncome - totalExpense;

    const formatted = transactions.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      category: t.category,
      amount: t.amount,
      walletId: t.walletId?._id?.toString(),
      walletName: t.walletId?.name || 'Dompet Dihapus',
      destinationWalletId: t.destinationWalletId?._id?.toString(),
      destinationWalletName: t.destinationWalletId?.name,
      date: t.date,
      notes: t.notes || '',
      recordedByName: t.recordedBy?.name || 'Admin',
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow,
      },
      transactions: formatted,
    });
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
    const { type, category, amount, walletId, date, notes } = body;

    const txAmount = Number(amount);
    if (!txAmount || txAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal transaksi minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Jenis transaksi harus income atau expense.' },
        { status: 400 }
      );
    }

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Kategori transaksi wajib diisi.' },
        { status: 400 }
      );
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet kas wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    if (type === 'expense') {
      const updateResult = await Wallet.updateOne(
        {
          _id: walletObjId,
          storeId: storeObjId,
          isArchived: false,
          balance: { $gte: txAmount },
        },
        { $inc: { balance: -txAmount } }
      );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: `Saldo ${wallet.name} tidak mencukupi untuk pengeluaran ini. (Saldo: Rp ${wallet.balance.toLocaleString('id-ID')})`,
          },
          { status: 422 }
        );
      }
    } else {
      await Wallet.updateOne({ _id: walletObjId }, { $inc: { balance: txAmount } });
    }

    const newTx = await Transaction.create({
      storeId: storeObjId,
      walletId: walletObjId,
      type,
      category: category.trim(),
      amount: txAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || '',
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Transaksi ${type === 'income' ? 'kas masuk' : 'kas keluar'} berhasil disimpan.`,
        transaction: {
          id: newTx._id.toString(),
          type: newTx.type,
          category: newTx.category,
          amount: newTx.amount,
          walletName: wallet.name,
          date: newTx.date,
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
