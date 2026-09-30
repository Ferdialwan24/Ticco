import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import CashAdvance from '@/models/CashAdvance';
import Wallet from '@/models/Wallet';
import Staff from '@/models/Staff';
import Transaction from '@/models/Transaction';
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
    const status = searchParams.get('status');
    const staffId = searchParams.get('staffId');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const query: any = { storeId: storeObjId };

    if (status && ['unsettled', 'settled'].includes(status)) {
      query.status = status;
    }

    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    const advances = await CashAdvance.find(query)
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const formatted = advances.map((a) => ({
      id: a._id.toString(),
      staffId: a.staffId?._id?.toString(),
      staffName: a.staffId?.name || 'Staf Dihapus',
      amount: a.amount,
      walletId: a.walletId?._id?.toString(),
      walletName: a.walletId?.name || 'Dompet Dihapus',
      date: a.date,
      status: a.status,
      settledAtPeriod: a.settledAtPeriod || null,
      notes: a.notes || '',
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ advances: formatted });
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
    // PRD: Owner & Admin can record cash advances
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { staffId, amount, walletId, date, notes } = body;

    const advanceAmount = Number(amount);
    if (!advanceAmount || advanceAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal kasbon minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!staffId || !walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Staf dan dompet kas sumber wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    // 1. Verify staff exists and is active
    const staff = await Staff.findOne({
      _id: staffObjId,
      storeId: storeObjId,
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Data staf tidak ditemukan.' },
        { status: 400 }
      );
    }

    // 2. Verify wallet and check balance
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

    // 3. Atomically decrement wallet balance with balance check ($gte)
    const walletUpdate = await Wallet.updateOne(
      {
        _id: walletObjId,
        storeId: storeObjId,
        isArchived: false,
        balance: { $gte: advanceAmount },
      },
      { $inc: { balance: -advanceAmount } }
    );

    if (walletUpdate.modifiedCount === 0) {
      return NextResponse.json(
        {
          error: 'UnprocessableEntity',
          message: `Saldo ${wallet.name} tidak mencukupi untuk penarikan kasbon ini (Saldo: Rp ${wallet.balance.toLocaleString('id-ID')}).`,
        },
        { status: 422 }
      );
    }

    // 4. Create CashAdvance record (status: 'unsettled')
    const advance = await CashAdvance.create({
      storeId: storeObjId,
      staffId: staffObjId,
      amount: advanceAmount,
      walletId: walletObjId,
      date: date ? new Date(date) : new Date(),
      status: 'unsettled',
      notes: notes?.trim() || `Kasbon staf ${staff.name}`,
    });

    // 5. Also log in transactions for operational cash flow tracking
    await Transaction.create({
      storeId: storeObjId,
      walletId: walletObjId,
      type: 'expense',
      category: 'Kasbon Staf',
      amount: advanceAmount,
      date: advance.date,
      notes: notes?.trim() || `Kasbon staf: ${staff.name}`,
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Kasbon sebesar Rp ${advanceAmount.toLocaleString('id-ID')} untuk ${staff.name} berhasil dicatat.`,
        advance: {
          id: advance._id.toString(),
          staffName: staff.name,
          amount: advance.amount,
          status: advance.status,
          date: advance.date,
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
