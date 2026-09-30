import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import StoreMember, { StoreRole } from '@/models/StoreMember';
import User from '@/models/User';
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
    const members = await StoreMember.find({ storeId })
      .populate<{ userId: { _id: mongoose.Types.ObjectId; name: string; username: string; email: string; avatarUrl: string } }>(
        'userId'
      )
      .sort({ joinedAt: 1 })
      .lean();

    const formatted = members
      .filter((m) => m.userId)
      .map((m) => ({
        id: m._id.toString(),
        userId: m.userId._id.toString(),
        name: m.userId.name,
        username: m.userId.username,
        email: m.userId.email,
        avatarUrl: m.userId.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    return NextResponse.json({ members: formatted });
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
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const rawUsername = body.username;
    const role: StoreRole = body.role || 'viewer';

    if (!rawUsername || typeof rawUsername !== 'string') {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Username tujuan wajib diisi.' },
        { status: 400 }
      );
    }

    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Peran yang diizinkan hanya Admin atau Viewer.' },
        { status: 400 }
      );
    }

    const username = rawUsername.toLowerCase().trim();

    await connectToDatabase();
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return NextResponse.json(
        {
          error: 'NotFound',
          message: `Pengguna dengan username "${username}" tidak ditemukan. Pastikan pengguna telah login dan melengkapi onboarding.`,
        },
        { status: 404 }
      );
    }

    const existingMember = await StoreMember.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
      userId: targetUser._id,
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Pengguna @${username} sudah terdaftar sebagai anggota toko ini (${existingMember.role}).`,
        },
        { status: 409 }
      );
    }

    const newMember = await StoreMember.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      userId: targetUser._id,
      role,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil mengundang @${username} sebagai ${role}.`,
        member: {
          id: newMember._id.toString(),
          userId: targetUser._id.toString(),
          name: targetUser.name,
          username: targetUser.username,
          email: targetUser.email,
          role: newMember.role,
          joinedAt: newMember.joinedAt,
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

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'DELETE', ['owner']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'BadRequest', message: 'memberId wajib disediakan.' }, { status: 400 });
    }

    await connectToDatabase();
    const member = await StoreMember.findById(memberId);
    if (!member || member.storeId.toString() !== storeId) {
      return NextResponse.json({ error: 'NotFound', message: 'Anggota tidak ditemukan.' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Owner toko tidak dapat dihapus dari keanggotaan.' },
        { status: 400 }
      );
    }

    await StoreMember.findByIdAndDelete(memberId);

    return NextResponse.json({ success: true, message: 'Anggota berhasil dihapus dari toko.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
