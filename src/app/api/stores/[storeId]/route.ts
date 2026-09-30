import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongoose';
import Store from '@/models/Store';
import StoreMember from '@/models/StoreMember';
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
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404 });
    }

    const memberCount = await StoreMember.countDocuments({ storeId });
    const wallets = await Wallet.find({ storeId, isArchived: false }).lean();
    const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

    return NextResponse.json({
      store: {
        id: store._id.toString(),
        name: store.name,
        role: authResult.role,
        isOwner: authResult.role === 'owner',
        memberCount,
        walletCount: wallets.length,
        totalBalance,
        createdAt: store.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'PATCH', ['owner']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const name = body.name?.trim();
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama toko wajib 2-60 karakter.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const updated = await Store.findByIdAndUpdate(
      storeId,
      { name },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      store: {
        id: updated!._id.toString(),
        name: updated!.name,
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
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'DELETE', ['owner']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    await connectToDatabase();
    await Store.findByIdAndDelete(storeId);
    await StoreMember.deleteMany({ storeId });

    return NextResponse.json({
      success: true,
      message: 'Toko berhasil dihapus.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
