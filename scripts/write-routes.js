const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const fullPath = path.join(__dirname, '..', filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`Wrote: ${filePath} (${fs.statSync(fullPath).size} bytes)`);
}

// 1. src/app/api/user/profile/route.ts
writeFile('src/app/api/user/profile/route.ts', `
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
`);

// 2. src/app/api/user/onboarding/route.ts
writeFile('src/app/api/user/onboarding/route.ts', `
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
`);

// 3. src/app/api/stores/route.ts
writeFile('src/app/api/stores/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Store from '@/models/Store';
import StoreMember from '@/models/StoreMember';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/auth-guard';

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
`);

// 4. src/app/api/stores/[storeId]/route.ts
writeFile('src/app/api/stores/[storeId]/route.ts', `
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
`);

// 5. src/app/api/stores/[storeId]/members/route.ts
writeFile('src/app/api/stores/[storeId]/members/route.ts', `
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
          message: \`Pengguna dengan username "\${username}" tidak ditemukan. Pastikan pengguna telah login dan melengkapi onboarding.\`,
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
          message: \`Pengguna @\${username} sudah terdaftar sebagai anggota toko ini (\${existingMember.role}).\`,
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
        message: \`Berhasil mengundang @\${username} sebagai \${role}.\`,
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
`);

// 6. src/app/api/stores/[storeId]/wallets/route.ts
writeFile('src/app/api/stores/[storeId]/wallets/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
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
    const wallets = await Wallet.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      isArchived: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    const formatted = wallets.map((w) => ({
      id: w._id.toString(),
      name: w.name,
      balance: w.balance,
      isArchived: w.isArchived,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({ wallets: formatted });
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
    const name = body.name?.trim();
    const initialBalance = Number(body.initialBalance) || 0;

    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama dompet wajib diisi (2 - 50 karakter).' },
        { status: 400 }
      );
    }

    if (initialBalance < 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Saldo awal dompet tidak boleh negatif.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newWallet = await Wallet.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      name,
      balance: initialBalance,
    });

    return NextResponse.json(
      {
        success: true,
        wallet: {
          id: newWallet._id.toString(),
          name: newWallet.name,
          balance: newWallet.balance,
          isArchived: newWallet.isArchived,
          createdAt: newWallet.createdAt,
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
`);

// 7. src/app/api/stores/[storeId]/wallets/[walletId]/route.ts
writeFile('src/app/api/stores/[storeId]/wallets/[walletId]/route.ts', `
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
`);

// 8. src/app/api/stores/[storeId]/wallets/transfer/route.ts
writeFile('src/app/api/stores/[storeId]/wallets/transfer/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
import { verifyStoreAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { storeId } = await params;
    const authResult = await verifyStoreAccess(storeId, 'POST', ['owner', 'admin']);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { fromWalletId, toWalletId, amount, date, notes } = body;

    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal transfer harus lebih besar dari 0.' },
        { status: 400 }
      );
    }

    if (!fromWalletId || !toWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet asal dan tujuan wajib dipilih.' },
        { status: 400 }
      );
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet asal dan tujuan tidak boleh sama.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const fromObjId = new mongoose.Types.ObjectId(fromWalletId);
    const toObjId = new mongoose.Types.ObjectId(toWalletId);
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    const destWallet = await Wallet.findOne({
      _id: toObjId,
      storeId: storeObjId,
      isArchived: false,
    });
    if (!destWallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    const debitResult = await Wallet.updateOne(
      {
        _id: fromObjId,
        storeId: storeObjId,
        isArchived: false,
        balance: { $gte: transferAmount },
      },
      { $inc: { balance: -transferAmount } }
    );

    if (debitResult.modifiedCount === 0) {
      const sourceWallet = await Wallet.findOne({ _id: fromObjId, storeId: storeObjId });
      if (!sourceWallet) {
        return NextResponse.json(
          { error: 'BadRequest', message: 'Dompet asal tidak ditemukan.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'UnprocessableEntity',
          message: \`Saldo dompet asal tidak mencukupi (Saldo saat ini: Rp \${sourceWallet.balance.toLocaleString('id-ID')}).\`,
        },
        { status: 422 }
      );
    }

    const creditResult = await Wallet.updateOne(
      { _id: toObjId, storeId: storeObjId },
      { $inc: { balance: transferAmount } }
    );

    if (creditResult.modifiedCount === 0) {
      await Wallet.updateOne(
        { _id: fromObjId, storeId: storeObjId },
        { $inc: { balance: transferAmount } }
      );
      return NextResponse.json(
        { error: 'InternalServerError', message: 'Gagal mengkredit dompet tujuan. Transaksi dibatalkan.' },
        { status: 500 }
      );
    }

    const transferTx = await Transaction.create({
      storeId: storeObjId,
      walletId: fromObjId,
      destinationWalletId: toObjId,
      type: 'transfer',
      category: 'Transfer Antar-Dompet',
      amount: transferAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || \`Transfer dana internal ke \${destWallet.name}\`,
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer antar-dompet berhasil dilakukan.',
      transaction: {
        id: transferTx._id.toString(),
        amount: transferTx.amount,
        fromWalletId,
        toWalletId,
        date: transferTx.date,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
`);

// 9. src/app/api/stores/[storeId]/capital/route.ts
writeFile('src/app/api/stores/[storeId]/capital/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import CapitalContribution from '@/models/CapitalContribution';
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
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    const contributions = await CapitalContribution.find({ storeId: storeObjId })
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .populate<{ recordedBy: { _id: mongoose.Types.ObjectId; name: string } }>('recordedBy')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const totalCapital = contributions.reduce((sum, item) => sum + item.amount, 0);

    const contributorMap: Record<
      string,
      {
        contributorName: string;
        totalAmount: number;
        contributionCount: number;
        lastDate: Date;
      }
    > = {};

    for (const c of contributions) {
      const key = c.contributorName.trim();
      if (!contributorMap[key]) {
        contributorMap[key] = {
          contributorName: key,
          totalAmount: 0,
          contributionCount: 0,
          lastDate: c.date,
        };
      }
      contributorMap[key].totalAmount += c.amount;
      contributorMap[key].contributionCount += 1;
      if (new Date(c.date) > new Date(contributorMap[key].lastDate)) {
        contributorMap[key].lastDate = c.date;
      }
    }

    const equityBreakdown = Object.values(contributorMap)
      .map((entry) => ({
        contributorName: entry.contributorName,
        totalAmount: entry.totalAmount,
        percentage:
          totalCapital > 0
            ? Math.round((entry.totalAmount / totalCapital) * 10000) / 100
            : 0,
        contributionCount: entry.contributionCount,
        lastDate: entry.lastDate,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const formattedContributions = contributions.map((c) => ({
      id: c._id.toString(),
      contributorName: c.contributorName,
      amount: c.amount,
      walletName: c.walletId?.name || 'Dompet Tidak Diketahui',
      walletId: c.walletId?._id?.toString(),
      date: c.date,
      notes: c.notes || '',
      recordedByName: c.recordedBy?.name || 'Admin',
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      totalCapital,
      equityBreakdown,
      contributions: formattedContributions,
    });
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
    const { contributorName, amount, walletId, date, notes } = body;

    const trimmedName = contributorName?.trim();
    const contributionAmount = Number(amount);

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nama penyetor modal wajib diisi.' },
        { status: 400 }
      );
    }

    if (!contributionAmount || contributionAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal setoran modal minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan penerimaan modal wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tujuan tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    await Wallet.updateOne({ _id: walletObjId }, { $inc: { balance: contributionAmount } });

    const newContribution = await CapitalContribution.create({
      storeId: storeObjId,
      contributorName: trimmedName,
      amount: contributionAmount,
      walletId: walletObjId,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || '',
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Setoran modal berhasil dicatat dan saldo dompet telah bertambah.',
        contribution: {
          id: newContribution._id.toString(),
          contributorName: newContribution.contributorName,
          amount: newContribution.amount,
          walletName: wallet.name,
          date: newContribution.date,
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
`);

// 10. src/app/api/stores/[storeId]/transactions/route.ts
writeFile('src/app/api/stores/[storeId]/transactions/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Transaction from '@/models/Transaction';
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const walletId = searchParams.get('walletId');
    const type = searchParams.get('type');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);

    const query: any = { storeId: storeObjId };

    if (type && ['income', 'expense', 'transfer'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (walletId && mongoose.Types.ObjectId.isValid(walletId)) {
      query.walletId = new mongoose.Types.ObjectId(walletId);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(query)
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .populate<{ destinationWalletId?: { _id: mongoose.Types.ObjectId; name: string } }>('destinationWalletId')
      .populate<{ recordedBy: { _id: mongoose.Types.ObjectId; name: string } }>('recordedBy')
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const summaryFilter = { ...query };
    delete summaryFilter.type;

    const allInFilter = await Transaction.find({
      ...summaryFilter,
      type: { $in: ['income', 'expense'] },
    }).lean();

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of allInFilter) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }
    }

    const netCashFlow = totalIncome - totalExpense;

    const formatted = transactions.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      category: t.category,
      amount: t.amount,
      walletId: t.walletId?._id?.toString(),
      walletName: t.walletId?.name || 'Dompet Dihapus',
      destinationWalletId: t.destinationWalletId?._id?.toString(),
      destinationWalletName: t.destinationWalletId?.name,
      date: t.date,
      notes: t.notes || '',
      recordedByName: t.recordedBy?.name || 'Admin',
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow,
      },
      transactions: formatted,
    });
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
    const { type, category, amount, walletId, date, notes } = body;

    const txAmount = Number(amount);
    if (!txAmount || txAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal transaksi minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Jenis transaksi harus income atau expense.' },
        { status: 400 }
      );
    }

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Kategori transaksi wajib diisi.' },
        { status: 400 }
      );
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet kas wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    if (type === 'expense') {
      const updateResult = await Wallet.updateOne(
        {
          _id: walletObjId,
          storeId: storeObjId,
          isArchived: false,
          balance: { $gte: txAmount },
        },
        { $inc: { balance: -txAmount } }
      );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: \`Saldo \${wallet.name} tidak mencukupi untuk pengeluaran ini. (Saldo: Rp \${wallet.balance.toLocaleString('id-ID')})\`,
          },
          { status: 422 }
        );
      }
    } else {
      await Wallet.updateOne({ _id: walletObjId }, { $inc: { balance: txAmount } });
    }

    const newTx = await Transaction.create({
      storeId: storeObjId,
      walletId: walletObjId,
      type,
      category: category.trim(),
      amount: txAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || '',
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: \`Transaksi \${type === 'income' ? 'kas masuk' : 'kas keluar'} berhasil disimpan.\`,
        transaction: {
          id: newTx._id.toString(),
          type: newTx.type,
          category: newTx.category,
          amount: newTx.amount,
          walletName: wallet.name,
          date: newTx.date,
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
`);

// 11. src/app/api/stores/[storeId]/staff/route.ts
writeFile('src/app/api/stores/[storeId]/staff/route.ts', `
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
            message: \`User dengan username @\${username} tidak ditemukan. Pengguna harus sudah mendaftar dan mengisi username.\`,
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
`);

// 12. src/app/api/stores/[storeId]/staff/[staffId]/route.ts
writeFile('src/app/api/stores/[storeId]/staff/[staffId]/route.ts', `
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
            { error: 'NotFound', message: \`Username @\${body.username} tidak ditemukan.\` },
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
`);

// 13. src/app/api/stores/[storeId]/advances/route.ts
writeFile('src/app/api/stores/[storeId]/advances/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import CashAdvance from '@/models/CashAdvance';
import Wallet from '@/models/Wallet';
import Staff from '@/models/Staff';
import Transaction from '@/models/Transaction';
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const staffId = searchParams.get('staffId');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const query: any = { storeId: storeObjId };

    if (status && ['unsettled', 'settled'].includes(status)) {
      query.status = status;
    }

    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    const advances = await CashAdvance.find(query)
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ walletId: { _id: mongoose.Types.ObjectId; name: string } }>('walletId')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const formatted = advances.map((a) => ({
      id: a._id.toString(),
      staffId: a.staffId?._id?.toString(),
      staffName: a.staffId?.name || 'Staf Dihapus',
      amount: a.amount,
      walletId: a.walletId?._id?.toString(),
      walletName: a.walletId?.name || 'Dompet Dihapus',
      date: a.date,
      status: a.status,
      settledAtPeriod: a.settledAtPeriod || null,
      notes: a.notes || '',
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ advances: formatted });
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
    const { staffId, amount, walletId, date, notes } = body;

    const advanceAmount = Number(amount);
    if (!advanceAmount || advanceAmount <= 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Nominal kasbon minimal Rp 1.' },
        { status: 400 }
      );
    }

    if (!staffId || !walletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Staf dan dompet kas sumber wajib dipilih.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);
    const walletObjId = new mongoose.Types.ObjectId(walletId);

    const staff = await Staff.findOne({
      _id: staffObjId,
      storeId: storeObjId,
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Data staf tidak ditemukan.' },
        { status: 400 }
      );
    }

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet tidak ditemukan atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    const walletUpdate = await Wallet.updateOne(
      {
        _id: walletObjId,
        storeId: storeObjId,
        isArchived: false,
        balance: { $gte: advanceAmount },
      },
      { $inc: { balance: -advanceAmount } }
    );

    if (walletUpdate.modifiedCount === 0) {
      return NextResponse.json(
        {
          error: 'UnprocessableEntity',
          message: \`Saldo \${wallet.name} tidak mencukupi untuk penarikan kasbon ini (Saldo: Rp \${wallet.balance.toLocaleString('id-ID')}).\`,
        },
        { status: 422 }
      );
    }

    const advance = await CashAdvance.create({
      storeId: storeObjId,
      staffId: staffObjId,
      amount: advanceAmount,
      walletId: walletObjId,
      date: date ? new Date(date) : new Date(),
      status: 'unsettled',
      notes: notes?.trim() || \`Kasbon staf \${staff.name}\`,
    });

    await Transaction.create({
      storeId: storeObjId,
      walletId: walletObjId,
      type: 'expense',
      category: 'Kasbon Staf',
      amount: advanceAmount,
      date: advance.date,
      notes: notes?.trim() || \`Kasbon staf: \${staff.name}\`,
      recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
    });

    return NextResponse.json(
      {
        success: true,
        message: \`Kasbon sebesar Rp \${advanceAmount.toLocaleString('id-ID')} untuk \${staff.name} berhasil dicatat.\`,
        advance: {
          id: advance._id.toString(),
          staffName: staff.name,
          amount: advance.amount,
          status: advance.status,
          date: advance.date,
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
`);

// 14. src/app/api/stores/[storeId]/payroll/route.ts
writeFile('src/app/api/stores/[storeId]/payroll/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
import CashAdvance from '@/models/CashAdvance';
import Payslip from '@/models/Payslip';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';
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

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const period = searchParams.get('period');
    const bonus = Number(searchParams.get('bonus')) || 0;

    if (!staffId || !period) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'staffId dan period (YYYY-MM) wajib disediakan.' },
        { status: 400 }
      );
    }

    if (!/^\\d{4}-\\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Format periode harus YYYY-MM (contoh: 2026-09).' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);

    const existingPayslip = await Payslip.findOne({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
    })
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .lean();

    if (existingPayslip) {
      return NextResponse.json({
        isAlreadyPaid: true,
        payslip: {
          id: existingPayslip._id.toString(),
          period: existingPayslip.period,
          baseSalary: existingPayslip.baseSalarySnapshot,
          allowances: existingPayslip.allowanceSnapshot,
          bonus: existingPayslip.bonus,
          advanceDeduction: existingPayslip.advanceDeduction,
          netPayout: existingPayslip.netPayout,
          paymentWalletName: existingPayslip.paymentWalletId?.name || 'Dompet',
          paidAt: existingPayslip.paidAt,
        },
      });
    }

    const staff = await Staff.findOne({ _id: staffObjId, storeId: storeObjId });
    if (!staff) {
      return NextResponse.json({ error: 'NotFound', message: 'Data staf tidak ditemukan.' }, { status: 404 });
    }

    const unsettledAdvances = await CashAdvance.find({
      storeId: storeObjId,
      staffId: staffObjId,
      status: 'unsettled',
    })
      .sort({ date: 1 })
      .lean();

    const advanceDeduction = unsettledAdvances.reduce((sum, item) => sum + item.amount, 0);
    const grossSalary = staff.baseSalary + staff.allowances + bonus;
    const netPayout = Math.max(0, grossSalary - advanceDeduction);

    return NextResponse.json({
      isAlreadyPaid: false,
      preview: {
        staffId: staff._id.toString(),
        staffName: staff.name,
        period,
        baseSalary: staff.baseSalary,
        allowances: staff.allowances,
        bonus,
        advanceDeduction,
        netPayout,
        unsettledAdvances: unsettledAdvances.map((a) => ({
          id: a._id.toString(),
          amount: a.amount,
          date: a.date,
          notes: a.notes,
        })),
      },
    });
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
    const { staffId, period, bonus = 0, paymentWalletId } = body;

    if (!staffId || !period || !paymentWalletId) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'staffId, period (YYYY-MM), dan paymentWalletId wajib diisi.' },
        { status: 400 }
      );
    }

    if (!/^\\d{4}-\\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Format periode harus YYYY-MM.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const staffObjId = new mongoose.Types.ObjectId(staffId);
    const walletObjId = new mongoose.Types.ObjectId(paymentWalletId);

    const staff = await Staff.findOne({ _id: staffObjId, storeId: storeObjId });
    if (!staff) {
      return NextResponse.json({ error: 'NotFound', message: 'Data staf tidak ditemukan.' }, { status: 404 });
    }

    const existing = await Payslip.findOne({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
    });
    if (existing) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: \`Gaji staf \${staff.name} untuk periode \${period} sudah pernah diselesaikan.\`,
        },
        { status: 409 }
      );
    }

    const wallet = await Wallet.findOne({
      _id: walletObjId,
      storeId: storeObjId,
      isArchived: false,
    });
    if (!wallet) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Dompet pembayaran gaji tidak valid atau telah diarsipkan.' },
        { status: 400 }
      );
    }

    const unsettledAdvances = await CashAdvance.find({
      storeId: storeObjId,
      staffId: staffObjId,
      status: 'unsettled',
    });

    const advanceDeduction = unsettledAdvances.reduce((sum, item) => sum + item.amount, 0);
    const bonusAmount = Math.max(0, Number(bonus) || 0);
    const grossSalary = staff.baseSalary + staff.allowances + bonusAmount;
    const netPayout = Math.max(0, grossSalary - advanceDeduction);

    if (netPayout > 0) {
      const walletDebit = await Wallet.updateOne(
        {
          _id: walletObjId,
          storeId: storeObjId,
          isArchived: false,
          balance: { $gte: netPayout },
        },
        { $inc: { balance: -netPayout } }
      );

      if (walletDebit.modifiedCount === 0) {
        return NextResponse.json(
          {
            error: 'UnprocessableEntity',
            message: \`Saldo \${wallet.name} tidak mencukupi untuk transfer gaji bersih (Dibutuhkan: Rp \${netPayout.toLocaleString('id-ID')}, Saldo saat ini: Rp \${wallet.balance.toLocaleString('id-ID')}).\`,
          },
          { status: 422 }
        );
      }
    }

    const unsettledIds = unsettledAdvances.map((a) => a._id);
    if (unsettledIds.length > 0) {
      await CashAdvance.updateMany(
        { _id: { $in: unsettledIds } },
        {
          $set: {
            status: 'settled',
            settledAtPeriod: period,
          },
        }
      );
    }

    const payslip = await Payslip.create({
      storeId: storeObjId,
      staffId: staffObjId,
      period,
      baseSalarySnapshot: staff.baseSalary,
      allowanceSnapshot: staff.allowances,
      bonus: bonusAmount,
      advanceDeduction,
      netPayout,
      paymentWalletId: walletObjId,
      paidAt: new Date(),
      settledAdvanceIds: unsettledIds,
    });

    if (netPayout > 0) {
      await Transaction.create({
        storeId: storeObjId,
        walletId: walletObjId,
        type: 'expense',
        category: 'Gaji & Payroll',
        amount: netPayout,
        date: new Date(),
        notes: \`Pelunasan gaji \${staff.name} periode \${period} (Take Home Pay)\`,
        recordedBy: new mongoose.Types.ObjectId(authResult.user!.userId),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: \`Gaji untuk \${staff.name} periode \${period} berhasil diselesaikan.\`,
        payslip: {
          id: payslip._id.toString(),
          staffName: staff.name,
          period: payslip.period,
          baseSalary: payslip.baseSalarySnapshot,
          allowances: payslip.allowanceSnapshot,
          bonus: payslip.bonus,
          advanceDeduction: payslip.advanceDeduction,
          netPayout: payslip.netPayout,
          paymentWalletName: wallet.name,
          paidAt: payslip.paidAt,
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
`);

// 15. src/app/api/stores/[storeId]/payslips/route.ts
writeFile('src/app/api/stores/[storeId]/payslips/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Payslip from '@/models/Payslip';
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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period');
    const staffId = searchParams.get('staffId');

    await connectToDatabase();
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const query: any = { storeId: storeObjId };

    if (period) query.period = period;
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    const payslips = await Payslip.find(query)
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .sort({ period: -1, paidAt: -1 })
      .lean();

    const formatted = payslips.map((p) => ({
      id: p._id.toString(),
      staffId: p.staffId?._id?.toString(),
      staffName: p.staffId?.name || 'Staf',
      period: p.period,
      baseSalarySnapshot: p.baseSalarySnapshot,
      allowanceSnapshot: p.allowanceSnapshot,
      bonus: p.bonus,
      advanceDeduction: p.advanceDeduction,
      netPayout: p.netPayout,
      paymentWalletName: p.paymentWalletId?.name || 'Dompet',
      paidAt: p.paidAt,
    }));

    return NextResponse.json({ payslips: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
`);

// 16. src/app/api/stores/[storeId]/payslips/[payslipId]/route.ts
writeFile('src/app/api/stores/[storeId]/payslips/[payslipId]/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Payslip from '@/models/Payslip';
import Store from '@/models/Store';
import { verifyStaffOrAdminAccess } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ storeId: string; payslipId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { storeId, payslipId } = await params;

    await connectToDatabase();
    const payslip = await Payslip.findOne({
      _id: new mongoose.Types.ObjectId(payslipId),
      storeId: new mongoose.Types.ObjectId(storeId),
    })
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .populate<{ paymentWalletId: { _id: mongoose.Types.ObjectId; name: string } }>('paymentWalletId')
      .populate<{ settledAdvanceIds: Array<{ _id: mongoose.Types.ObjectId; amount: number; date: Date; notes?: string }> }>(
        'settledAdvanceIds'
      )
      .lean();

    if (!payslip) {
      return NextResponse.json({ error: 'Slip gaji tidak ditemukan.' }, { status: 404 });
    }

    const staffId = payslip.staffId._id.toString();
    const authResult = await verifyStaffOrAdminAccess(storeId, staffId);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const store = await Store.findById(storeId).lean();

    return NextResponse.json({
      payslip: {
        id: payslip._id.toString(),
        storeName: store?.name || 'Ticco Store',
        staffName: payslip.staffId.name,
        period: payslip.period,
        baseSalarySnapshot: payslip.baseSalarySnapshot,
        allowanceSnapshot: payslip.allowanceSnapshot,
        bonus: payslip.bonus,
        grossEarnings:
          payslip.baseSalarySnapshot + payslip.allowanceSnapshot + payslip.bonus,
        advanceDeduction: payslip.advanceDeduction,
        netPayout: payslip.netPayout,
        paymentWalletName: payslip.paymentWalletId?.name || 'Dompet Kas',
        paidAt: payslip.paidAt,
        advances: (payslip.settledAdvanceIds || []).map((a) => ({
          id: a._id.toString(),
          amount: a.amount,
          date: a.date,
          notes: a.notes || 'Kasbon Staf',
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
`);

// 17. src/app/api/staff/my-payslips/route.ts
writeFile('src/app/api/staff/my-payslips/route.ts', `
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db/mongoose';
import Staff from '@/models/Staff';
import Payslip from '@/models/Payslip';
import { getAuthenticatedUser } from '@/lib/auth-guard';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjId = new mongoose.Types.ObjectId(user.userId);

    const staffProfiles = await Staff.find({ userId: userObjId })
      .populate<{ storeId: { _id: mongoose.Types.ObjectId; name: string } }>('storeId')
      .lean();

    if (staffProfiles.length === 0) {
      return NextResponse.json({
        hasLinkedStaff: false,
        payslips: [],
        message: 'Akun Anda belum ditautkan ke data staf di toko manapun.',
      });
    }

    const staffIds = staffProfiles.map((s) => s._id);

    const payslips = await Payslip.find({ staffId: { $in: staffIds } })
      .populate<{ storeId: { _id: mongoose.Types.ObjectId; name: string } }>('storeId')
      .populate<{ staffId: { _id: mongoose.Types.ObjectId; name: string } }>('staffId')
      .sort({ period: -1, paidAt: -1 })
      .lean();

    const formatted = payslips.map((p) => ({
      id: p._id.toString(),
      storeId: p.storeId._id.toString(),
      storeName: p.storeId.name,
      staffName: p.staffId.name,
      period: p.period,
      baseSalarySnapshot: p.baseSalarySnapshot,
      allowanceSnapshot: p.allowanceSnapshot,
      bonus: p.bonus,
      advanceDeduction: p.advanceDeduction,
      netPayout: p.netPayout,
      paidAt: p.paidAt,
    }));

    return NextResponse.json({
      hasLinkedStaff: true,
      payslips: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message },
      { status: 500 }
    );
  }
}
`);

console.log('All API route files written successfully!');
