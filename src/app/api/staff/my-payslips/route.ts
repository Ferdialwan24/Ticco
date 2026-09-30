import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
import Payslip from '@/models/Payslip';
import { getAuthenticatedUser } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjId = new mongoose.Types.ObjectId(user.userId);

    // Find all staff profiles linked to this user across all stores
    const staffProfiles = await Staff.find({ userId: userObjId })
      .populate<{ storeId: { _id: mongoose.Types.ObjectId; name: string } }>('storeId')
      .lean();

    if (staffProfiles.length === 0) {
      return NextResponse.json({
        hasLinkedStaff: false,
        payslips: [],
        message: 'Akun Anda belum ditautkan ke data staf di toko manapun.',
      });
    }

    const staffIds = staffProfiles.map((s) => s._id);

    const payslips = await Payslip.find({ staffId: { $in: staffIds } })
      .populate<{ storeId: { _id: mongoose.Types.ObjectId; name: string } }>('storeId')
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .sort({ period: -1, paidAt: -1 })
      .lean();

    const formatted = payslips.map((p) => ({
      id: p._id.toString(),
      storeId: p.storeId._id.toString(),
      storeName: p.storeId.name,
      staffName: p.staffId.name,
      period: p.period,
      baseSalarySnapshot: p.baseSalarySnapshot,
      allowanceSnapshot: p.allowanceSnapshot,
      bonus: p.bonus,
      advanceDeduction: p.advanceDeduction,
      netPayout: p.netPayout,
      paidAt: p.paidAt,
    }));

    return NextResponse.json({
      hasLinkedStaff: true,
      payslips: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
