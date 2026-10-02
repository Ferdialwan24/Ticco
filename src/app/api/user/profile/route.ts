import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
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
    let user = null;
    if (authUser.userId && mongoose.Types.ObjectId.isValid(authUser.userId)) {
      user = await User.findById(authUser.userId).lean();
    }
    if (!user && authUser.userEmail) {
      user = await User.findOne({ email: authUser.userEmail.toLowerCase() }).lean();
    }

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username || null,
        avatarUrl: user.avatarUrl || '',
        hasUsername: Boolean(user.username && user.username.trim().length > 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
