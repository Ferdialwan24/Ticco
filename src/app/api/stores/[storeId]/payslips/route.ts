import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Payslip from '@/models/Payslip';
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
    const period = searchParams.get('period');
    const staffId = searchParams.get('staffId');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const query: any = { storeId: storeObjId };

    if (period) query.period = period;
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    const payslips = await Payslip.find(query)
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .sort({ period: -1, paidAt: -1 })
      .lean();

    const formatted = payslips.map((p) => ({
      id: p._id.toString(),
      staffId: p.staffId?._id?.toString(),
      staffName: p.staffId?.name || 'Staf',
      period: p.period,
      baseSalarySnapshot: p.baseSalarySnapshot,
      allowanceSnapshot: p.allowanceSnapshot,
      bonus: p.bonus,
      advanceDeduction: p.advanceDeduction,
      netPayout: p.netPayout,
      paymentWalletName: p.paymentWalletId?.name || 'Dompet',
      paidAt: p.paidAt,
    }));

    return NextResponse.json({ payslips: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
