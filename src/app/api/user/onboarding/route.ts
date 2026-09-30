import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongoose';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/auth-guard';

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rawUsername = body.username;

    if (!rawUsername || typeof rawUsername !== 'string') {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    const username = rawUsername.toLowerCase().trim();

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error: 'BadRequest',
          message:
            'Format username tidak valid. Harus 3-20 karakter, hanya huruf, angka, dan garis bawah (_).',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const currentUser = await User.findById(authUser.userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (currentUser.username) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Username sudah disetel dan tidak dapat diubah.' },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Username sudah digunakan oleh pengguna lain. Silakan pilih username lain.' },
        { status: 409 }
      );
    }

    currentUser.username = username;
    if (body.name && typeof body.name === 'string' && body.name.trim()) {
      currentUser.name = body.name.trim();
    }
    await currentUser.save();

    return NextResponse.json({
      success: true,
      message: 'Username berhasil didaftarkan.',
      user: {
        id: currentUser._id.toString(),
        email: currentUser.email,
        name: currentUser.name,
        username: currentUser.username,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
