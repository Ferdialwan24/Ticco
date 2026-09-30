import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Wallet from '@/models/Wallet';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string; walletId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { storeId, walletId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'PATCH', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    await connectToDatabase();

    const wallet = await Wallet.findOne({
      _id: new mongoose.Types.ObjectId(walletId),
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Dompet tidak ditemukan.' }, { status: 404 });
    }

    if (body.name && typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Nama dompet wajib 2 - 50 karakter.' },
          { status: 400 }
        );
      }
      wallet.name = trimmed;
    }

    if (typeof body.isArchived === 'boolean') {
      wallet.isArchived = body.isArchived;
    }

    await wallet.save();

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet._id.toString(),
        name: wallet.name,
        balance: wallet.balance,
        isArchived: wallet.isArchived,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { storeId, walletId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'DELETE', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    await connectToDatabase();
    const wallet = await Wallet.findOne({
      _id: new mongoose.Types.ObjectId(walletId),
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Dompet tidak ditemukan.' }, { status: 404 });
    }

    wallet.isArchived = true;
    await wallet.save();

    return NextResponse.json({
      success: true,
      message: 'Dompet berhasil diarsipkan.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
