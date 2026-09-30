import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
import CashAdvance from '@/models/CashAdvance';
import Payslip from '@/models/Payslip';
import Wallet from '@/models/Wallet';
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
    const staffId = searchParams.get('staffId');
    const period = searchParams.get('period');
    const bonus = Number(searchParams.get('bonus')) || 0;

    if (!staffId || !period) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'staffId dan period (YYYY-MM) wajib disediakan.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Format periode harus YYYY-MM (contoh: 2026-09).' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);

    const existingPayslip = await Payslip.findOne({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
    })
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .lean();

    if (existingPayslip) {
      return NextResponse.json({
        isAlreadyPaid: true,
        payslip: {
          id: existingPayslip._id.toString(),
          period: existingPayslip.period,
          baseSalary: existingPayslip.baseSalarySnapshot,
          allowances: existingPayslip.allowanceSnapshot,
          bonus: existingPayslip.bonus,
          advanceDeduction: existingPayslip.advanceDeduction,
          netPayout: existingPayslip.netPayout,
          paymentWalletName: existingPayslip.paymentWalletId?.name || 'Dompet',
          paidAt: existingPayslip.paidAt,
        },
      });
    }

    const staff = await Staff.findOne({ _id: staffObjId, storeId: storeObjId });
    if (!staff) {
      return NextResponse.json({ error: 'NotFound', message: 'Data staf tidak ditemukan.' }, { status: 404 });
    }

    const unsettledAdvances = await CashAdvance.find({
      storeId: storeObjId,
      staffId: staffObjId,
      status: 'unsettled',
    })
      .sort({ date: 1 })
      .lean();

    const advanceDeduction = unsettledAdvances.reduce((sum, item) => sum + item.amount, 0);
    const grossSalary = staff.baseSalary + staff.allowances + bonus;
    const netPayout = Math.max(0, grossSalary - advanceDeduction);

    return NextResponse.json({
      isAlreadyPaid: false,
      preview: {
        staffId: staff._id.toString(),
        staffName: staff.name,
        period,
        baseSalary: staff.baseSalary,
        allowances: staff.allowances,
        bonus,
        advanceDeduction,
        netPayout,
        unsettledAdvances: unsettledAdvances.map((a) => ({
          id: a._id.toString(),
          amount: a.amount,
          date: a.date,
          notes: a.notes,
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

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { staffId, period, bonus = 0, paymentWalletId } = body;

    if (!staffId || !period || !paymentWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'staffId, period (YYYY-MM), dan paymentWalletId wajib diisi.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Format periode harus YYYY-MM.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);
    const walletObjId = new mongoose.Types.ObjectId(paymentWalletId);

    const staff = await Staff.findOne({ _id: staffObjId, storeId: storeObjId });
    if (!staff) {
      return NextResponse.json({ error: 'NotFound', message: 'Data staf tidak ditemukan.' }, { status: 404 });
    }

    const existing = await Payslip.findOne({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
    });
    if (existing) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Gaji staf ${staff.name} untuk periode ${period} sudah pernah diselesaikan.`,
        },
        { status: 409 }
      );
    }

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });
    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet pembayaran gaji tidak valid atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    const unsettledAdvances = await CashAdvance.find({
      storeId: storeObjId,
      staffId: staffObjId,
      status: 'unsettled',
    });

    const advanceDeduction = unsettledAdvances.reduce((sum, item) => sum + item.amount, 0);
    const bonusAmount = Math.max(0, Number(bonus) || 0);
    const grossSalary = staff.baseSalary + staff.allowances + bonusAmount;
    const netPayout = Math.max(0, grossSalary - advanceDeduction);

    if (netPayout > 0) {
      const walletDebit = await Wallet.updateOne(
        {
          _id: walletObjId,
          storeId: storeObjId,
          isArchived: false,
          balance: { $gte: netPayout },
        },
        { $inc: { balance: -netPayout } }
      );

      if (walletDebit.modifiedCount === 0) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: `Saldo ${wallet.name} tidak mencukupi untuk transfer gaji bersih (Dibutuhkan: Rp ${netPayout.toLocaleString('id-ID')}, Saldo saat ini: Rp ${wallet.balance.toLocaleString('id-ID')}).`,
          },
          { status: 422 }
        );
      }
    }

    const unsettledIds = unsettledAdvances.map((a) => a._id);
    if (unsettledIds.length > 0) {
      await CashAdvance.updateMany(
        { _id: { $in: unsettledIds } },
        {
          $set: {
            status: 'settled',
            settledAtPeriod: period,
          },
        }
      );
    }

    const payslip = await Payslip.create({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
      baseSalarySnapshot: staff.baseSalary,
      allowanceSnapshot: staff.allowances,
      bonus: bonusAmount,
      advanceDeduction,
      netPayout,
      paymentWalletId: walletObjId,
      paidAt: new Date(),
      settledAdvanceIds: unsettledIds,
    });

    if (netPayout > 0) {
      await Transaction.create({
        storeId: storeObjId,
        walletId: walletObjId,
        type: 'expense',
        category: 'Gaji & Payroll',
        amount: netPayout,
        date: new Date(),
        notes: `Pelunasan gaji ${staff.name} periode ${period} (Take Home Pay)`,
        recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Gaji untuk ${staff.name} periode ${period} berhasil diselesaikan.`,
        payslip: {
          id: payslip._id.toString(),
          staffName: staff.name,
          period: payslip.period,
          baseSalary: payslip.baseSalarySnapshot,
          allowances: payslip.allowanceSnapshot,
          bonus: payslip.bonus,
          advanceDeduction: payslip.advanceDeduction,
          netPayout: payslip.netPayout,
          paymentWalletName: wallet.name,
          paidAt: payslip.paidAt,
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
