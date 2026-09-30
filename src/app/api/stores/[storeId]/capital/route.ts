import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import CapitalContribution from '@/models/CapitalContribution';
import Wallet from '@/models/Wallet';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    // Accessible by Owner, Admin, and Family Viewer (Read-only)
    const authResult = await verifyStoreAccess(storeId, 'GET');
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    // 1. Fetch all capital contributions
    const contributions = await CapitalContribution.find({ storeId: storeObjId })
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .populate<{ recordedBy: { _id: mongoose.Types.ObjectId; name: string } }>('recordedBy')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // 2. Calculate total capital of store
    const totalCapital = contributions.reduce((sum, item) => sum + item.amount, 0);

    // 3. Aggregate equity ownership percentage per contributor
    // Formula from PRD FR-CAP-3:
    // Persentase = (Total Setoran Anggota / Total Modal Keseluruhan Toko) * 100%
    const contributorMap: Record<
      string,
      {
        contributorName: string;
        totalAmount: number;
        contributionCount: number;
        lastDate: Date;
      }
    > = {};

    for (const c of contributions) {
      const key = c.contributorName.trim();
      if (!contributorMap[key]) {
        contributorMap[key] = {
          contributorName: key,
          totalAmount: 0,
          contributionCount: 0,
          lastDate: c.date,
        };
      }
      contributorMap[key].totalAmount += c.amount;
      contributorMap[key].contributionCount += 1;
      if (new Date(c.date) > new Date(contributorMap[key].lastDate)) {
        contributorMap[key].lastDate = c.date;
      }
    }

    const equityBreakdown = Object.values(contributorMap)
      .map((entry) => ({
        contributorName: entry.contributorName,
        totalAmount: entry.totalAmount,
        percentage:
          totalCapital > 0
            ? Math.round((entry.totalAmount / totalCapital) * 10000) / 100
            : 0,
        contributionCount: entry.contributionCount,
        lastDate: entry.lastDate,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const formattedContributions = contributions.map((c) => ({
      id: c._id.toString(),
      contributorName: c.contributorName,
      amount: c.amount,
      walletName: c.walletId?.name || 'Dompet Tidak Diketahui',
      walletId: c.walletId?._id?.toString(),
      date: c.date,
      notes: c.notes || '',
      recordedByName: c.recordedBy?.name || 'Admin',
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      totalCapital,
      equityBreakdown,
      contributions: formattedContributions,
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
    // PRD: Owner & Admin can input capital contributions
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { contributorName, amount, walletId, date, notes } = body;

    const trimmedName = contributorName?.trim();
    const contributionAmount = Number(amount);

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama penyetor modal wajib diisi.' },
        { status: 400 }
      );
    }

    if (!contributionAmount || contributionAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal setoran modal minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan penerimaan modal wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    // 1. Verify wallet exists and belongs to this store
    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    // 2. Increment wallet balance atomically
    await Wallet.updateOne({ _id: walletObjId }, { $inc: { balance: contributionAmount } });

    // 3. Record capital contribution (strictly isolated from operational omzet)
    const newContribution = await CapitalContribution.create({
      storeId: storeObjId,
      contributorName: trimmedName,
      amount: contributionAmount,
      walletId: walletObjId,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || '',
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Setoran modal berhasil dicatat dan saldo dompet telah bertambah.',
        contribution: {
          id: newContribution._id.toString(),
          contributorName: newContribution.contributorName,
          amount: newContribution.amount,
          walletName: wallet.name,
          date: newContribution.date,
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
