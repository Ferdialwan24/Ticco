import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from './db/mongoose';
import StoreMember, { StoreRole } from '@/models/StoreMember';
import Staff from '@/models/Staff';

export interface AuthContext {
  userId: string;
  userEmail: string;
  userName: string;
  username?: string | null;
}

export interface StoreAuthResult {
  authorized: boolean;
  user?: AuthContext;
  role?: StoreRole;
  errorResponse?: NextResponse;
}

export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }
  return {
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name || '',
    username: (session.user as any).username || null,
  };
}

export async function verifyStoreAccess(
  storeId: string,
  requestMethod: string = 'GET',
  allowedRoles?: StoreRole[]
): Promise<StoreAuthResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized', message: 'Sesi login tidak valid. Silakan login terlebih dahulu.' },
        { status: 401 }
      ),
    };
  }

  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'BadRequest', message: 'ID Toko tidak valid.' },
        { status: 400 }
      ),
    };
  }

  await connectToDatabase();

  const membership = await StoreMember.findOne({
    storeId: new mongoose.Types.ObjectId(storeId),
    userId: new mongoose.Types.ObjectId(user.userId),
  });

  if (!membership) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Forbidden', message: 'Akses ditolak. Anda tidak memiliki akses ke toko ini.' },
        { status: 403 }
      ),
    };
  }

  const role = membership.role as StoreRole;

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod.toUpperCase());
  if (role === 'viewer' && isMutation) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Akses ditolak. Akun Viewer hanya memiliki izin baca (Read-Only).',
        },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          error: 'Forbidden',
          message: `Akses ditolak. Tindakan ini memerlukan peran: ${allowedRoles.join(', ')}.`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
    role,
  };
}

export async function verifyStaffOrAdminAccess(
  storeId: string,
  staffId: string
): Promise<StoreAuthResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized', message: 'Sesi login tidak valid.' },
        { status: 401 }
      ),
    };
  }

  await connectToDatabase();

  const membership = await StoreMember.findOne({
    storeId: new mongoose.Types.ObjectId(storeId),
    userId: new mongoose.Types.ObjectId(user.userId),
  });

  if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
    return {
      authorized: true,
      user,
      role: membership.role as StoreRole,
    };
  }

  const staff = await Staff.findOne({
    _id: new mongoose.Types.ObjectId(staffId),
    storeId: new mongoose.Types.ObjectId(storeId),
  });

  if (staff && staff.userId && staff.userId.toString() === user.userId) {
    return {
      authorized: true,
      user,
      role: 'viewer',
    };
  }

  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { error: 'Forbidden', message: 'Akses ditolak. Anda tidak berhak melihat data slip gaji ini.' },
      { status: 403 }
    ),
  };
}
