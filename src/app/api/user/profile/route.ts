import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongoose';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/auth-guard';

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username || null,
        avatarUrl: user.avatarUrl,
        hasUsername: Boolean(user.username),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
