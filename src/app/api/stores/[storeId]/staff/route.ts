import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
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
    const staffList = await Staff.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .populate<{ userId: { _id: mongoose.Types.ObjectId; name: string; username: string; email: string } }>('userId')
      .sort({ status: 1, name: 1 })
      .lean();

    const formatted = staffList.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      baseSalary: s.baseSalary,
      allowances: s.allowances,
      status: s.status,
      linkedUser: s.userId
        ? {
            id: s.userId._id.toString(),
            name: s.userId.name,
            username: s.userId.username,
            email: s.userId.email,
          }
        : null,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ staff: formatted });
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
    const { name, baseSalary, allowances, username } = body;

    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama staf wajib diisi (minimal 2 karakter).' },
        { status: 400 }
      );
    }

    const salary = Number(baseSalary) || 0;
    const allowance = Number(allowances) || 0;

    if (salary < 0 || allowance < 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Gaji pokok dan tunjangan tidak boleh negatif.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    let linkedUserId: mongoose.Types.ObjectId | undefined = undefined;

    if (username && typeof username === 'string' && username.trim()) {
      const user = await User.findOne({ username: username.toLowerCase().trim() });
      if (!user) {
        return NextResponse.json(
          {
            error: 'NotFound',
            message: `User dengan username @${username} tidak ditemukan. Pengguna harus sudah mendaftar dan mengisi username.`,
          },
          { status: 404 }
        );
      }
      linkedUserId = user._id;
    }

    const newStaff = await Staff.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      name: trimmedName,
      baseSalary: salary,
      allowances: allowance,
      status: 'active',
      userId: linkedUserId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Data staf berhasil ditambahkan.',
        staff: {
          id: newStaff._id.toString(),
          name: newStaff.name,
          baseSalary: newStaff.baseSalary,
          allowances: newStaff.allowances,
          status: newStaff.status,
          userId: linkedUserId?.toString(),
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
