import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Payslip from '@/models/Payslip';
import Store from '@/models/Store';
import { verifyStaffOrAdminAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string; payslipId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { storeId, payslipId } = await params;

    await connectToDatabase();
    const payslip = await Payslip.findOne({
      _id: new mongoose.Types.ObjectId(payslipId),
      storeId: new mongoose.Types.ObjectId(storeId),
    })
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .populate<{ settledAdvanceIds: Array<{ _id: mongoose.Types.ObjectId; amount: number; date: Date; notes?: string }> }>(
        'settledAdvanceIds'
      )
      .lean();

    if (!payslip) {
      return NextResponse.json({ error: 'Slip gaji tidak ditemukan.' }, { status: 404 });
    }

    const staffId = payslip.staffId._id.toString();
    const authResult = await verifyStaffOrAdminAccess(storeId, staffId);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const store = await Store.findById(storeId).lean();

    return NextResponse.json({
      payslip: {
        id: payslip._id.toString(),
        storeName: store?.name || 'Ticco Store',
        staffName: payslip.staffId.name,
        period: payslip.period,
        baseSalarySnapshot: payslip.baseSalarySnapshot,
        allowanceSnapshot: payslip.allowanceSnapshot,
        bonus: payslip.bonus,
        grossEarnings:
          payslip.baseSalarySnapshot + payslip.allowanceSnapshot + payslip.bonus,
        advanceDeduction: payslip.advanceDeduction,
        netPayout: payslip.netPayout,
        paymentWalletName: payslip.paymentWalletId?.name || 'Dompet Kas',
        paidAt: payslip.paidAt,
        advances: (payslip.settledAdvanceIds || []).map((a) => ({
          id: a._id.toString(),
          amount: a.amount,
          date: a.date,
          notes: a.notes || 'Kasbon Staf',
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
