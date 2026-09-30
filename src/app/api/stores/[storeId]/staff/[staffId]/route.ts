import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
import User from '@/models/User';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string; staffId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { storeId, staffId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'PATCH', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    await connectToDatabase();

    const staff = await Staff.findOne({
      _id: new mongoose.Types.ObjectId(staffId),
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!staff) {
      return NextResponse.json({ error: 'Data staf tidak ditemukan.' }, { status: 404 });
    }

    if (body.name && typeof body.name === 'string') {
      staff.name = body.name.trim();
    }

    if (typeof body.baseSalary === 'number') {
      if (body.baseSalary < 0) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Gaji pokok tidak boleh negatif.' },
          { status: 400 }
        );
      }
      staff.baseSalary = body.baseSalary;
    }

    if (typeof body.allowances === 'number') {
      if (body.allowances < 0) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Tunjangan tidak boleh negatif.' },
          { status: 400 }
        );
      }
      staff.allowances = body.allowances;
    }

    if (body.status && ['active', 'inactive'].includes(body.status)) {
      staff.status = body.status;
    }

    if ('username' in body) {
      if (body.username && typeof body.username === 'string' && body.username.trim()) {
        const user = await User.findOne({ username: body.username.toLowerCase().trim() });
        if (!user) {
          return NextResponse.json(
            { error: 'NotFound', message: `Username @${body.username} tidak ditemukan.` },
            { status: 404 }
          );
        }
        staff.userId = user._id;
      } else {
        staff.userId = undefined;
      }
    }

    await staff.save();

    return NextResponse.json({
      success: true,
      message: 'Data staf berhasil diperbarui.',
      staff: {
        id: staff._id.toString(),
        name: staff.name,
        baseSalary: staff.baseSalary,
        allowances: staff.allowances,
        status: staff.status,
        userId: staff.userId?.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
