import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Store from '@/models/Store';
import StoreMember from '@/models/StoreMember';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const memberships = await StoreMember.find({
      userId: new mongoose.Types.ObjectId(authUser.userId),
    })
      .populate<{ storeId: { _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId; createdAt: Date } }>(
        'storeId'
      )
      .lean();

    const stores = await Promise.all(
      memberships
        .filter((m) => m.storeId)
        .map(async (m) => {
          const storeDoc = m.storeId;
          const walletCount = await Wallet.countDocuments({
            storeId: storeDoc._id,
            isArchived: false,
          });

          return {
            id: storeDoc._id.toString(),
            name: storeDoc.name,
            role: m.role,
            isOwner: m.role === 'owner',
            walletCount,
            joinedAt: m.joinedAt,
            createdAt: storeDoc.createdAt,
          };
        })
    );

    return NextResponse.json({ stores });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const currentUser = await User.findById(authUser.userId);
    if (!currentUser || !currentUser.username) {
      return NextResponse.json(
        {
          error: 'PreconditionRequired',
          message: 'Silakan lengkapi username Anda terlebih dahulu sebelum membuat toko.',
        },
        { status: 428 }
      );
    }

    const body = await req.json();
    const name = body.name?.trim();

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama toko wajib diisi (2 - 60 karakter).' },
        { status: 400 }
      );
    }

    const newStore = await Store.create({
      name,
      ownerId: currentUser._id,
    });

    await StoreMember.create({
      storeId: newStore._id,
      userId: currentUser._id,
      role: 'owner',
    });

    const initialWalletName = body.initialWalletName?.trim() || 'Kas Tunai Toko';
    const defaultWallet = await Wallet.create({
      storeId: newStore._id,
      name: initialWalletName,
      balance: 0,
    });

    return NextResponse.json(
      {
        success: true,
        store: {
          id: newStore._id.toString(),
          name: newStore.name,
          role: 'owner',
          isOwner: true,
          initialWalletId: defaultWallet._id.toString(),
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
