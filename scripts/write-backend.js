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

// 1. src/lib/db/mongoose.ts
writeFile('src/lib/db/mongoose.ts', `
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'Variabel lingkungan MONGODB_URI belum didefinisikan pada .env.local atau environment hosting.'
    );
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
`);

// 2. src/models/User.ts
writeFile('src/models/User.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username?: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
`);

// 3. src/models/Store.ts
writeFile('src/models/Store.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStore extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);

export default Store;
`);

// 4. src/models/StoreMember.ts
writeFile('src/models/StoreMember.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export type StoreRole = 'owner' | 'admin' | 'viewer';

export interface IStoreMember extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: StoreRole;
  joinedAt: Date;
}

const StoreMemberSchema = new Schema<IStoreMember>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'viewer'],
      default: 'viewer',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

StoreMemberSchema.index({ storeId: 1, userId: 1 }, { unique: true });

export const StoreMember: Model<IStoreMember> =
  mongoose.models.StoreMember ||
  mongoose.model<IStoreMember>('StoreMember', StoreMemberSchema);

export default StoreMember;
`);

// 5. src/models/Wallet.ts
writeFile('src/models/Wallet.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  name: string;
  balance: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Saldo dompet tidak boleh negatif'],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
`);

// 6. src/models/CapitalContribution.ts
writeFile('src/models/CapitalContribution.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICapitalContribution extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  contributorName: string;
  amount: number;
  walletId: mongoose.Types.ObjectId;
  date: Date;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CapitalContributionSchema = new Schema<ICapitalContribution>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    contributorName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Nominal setoran modal minimal Rp 1'],
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CapitalContributionSchema.index({ storeId: 1, date: -1 });

export const CapitalContribution: Model<ICapitalContribution> =
  mongoose.models.CapitalContribution ||
  mongoose.model<ICapitalContribution>(
    'CapitalContribution',
    CapitalContributionSchema
  );

export default CapitalContribution;
`);

// 7. src/models/Transaction.ts
writeFile('src/models/Transaction.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  type: TransactionType;
  category: string;
  amount: number;
  date: Date;
  notes?: string;
  destinationWalletId?: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Nominal transaksi minimal Rp 1'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    destinationWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: function (this: ITransaction) {
        return this.type === 'transfer';
      },
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ storeId: 1, date: -1 });
TransactionSchema.index({ storeId: 1, type: 1, date: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
`);

// 8. src/models/Staff.ts
writeFile('src/models/Staff.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffStatus = 'active' | 'inactive';

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  name: string;
  baseSalary: number;
  allowances: number;
  status: StaffStatus;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    baseSalary: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Gaji pokok tidak boleh negatif'],
    },
    allowances: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Tunjangan tidak boleh negatif'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

StaffSchema.index({ storeId: 1, status: 1 });

export const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
`);

// 9. src/models/CashAdvance.ts
writeFile('src/models/CashAdvance.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export type CashAdvanceStatus = 'unsettled' | 'settled';

export interface ICashAdvance extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  amount: number;
  walletId: mongoose.Types.ObjectId;
  date: Date;
  status: CashAdvanceStatus;
  settledAtPeriod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashAdvanceSchema = new Schema<ICashAdvance>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Nominal kasbon minimal Rp 1'],
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['unsettled', 'settled'],
      default: 'unsettled',
      index: true,
    },
    settledAtPeriod: {
      type: String,
      match: /^\\d{4}-\\d{2}$/,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

CashAdvanceSchema.index({ storeId: 1, staffId: 1, status: 1 });

export const CashAdvance: Model<ICashAdvance> =
  mongoose.models.CashAdvance ||
  mongoose.model<ICashAdvance>('CashAdvance', CashAdvanceSchema);

export default CashAdvance;
`);

// 10. src/models/Payslip.ts
writeFile('src/models/Payslip.ts', `
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayslip extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  period: string;
  baseSalarySnapshot: number;
  allowanceSnapshot: number;
  bonus: number;
  advanceDeduction: number;
  netPayout: number;
  paymentWalletId: mongoose.Types.ObjectId;
  paidAt: Date;
  settledAdvanceIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
      match: /^\\d{4}-\\d{2}$/,
      index: true,
    },
    baseSalarySnapshot: {
      type: Number,
      required: true,
      default: 0,
    },
    allowanceSnapshot: {
      type: Number,
      required: true,
      default: 0,
    },
    bonus: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Bonus tidak boleh negatif'],
    },
    advanceDeduction: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Potongan kasbon tidak boleh negatif'],
    },
    netPayout: {
      type: Number,
      required: true,
      min: [0, 'Sisa transfer riil tidak boleh negatif'],
    },
    paymentWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    settledAdvanceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CashAdvance',
      },
    ],
  },
  {
    timestamps: true,
  }
);

PayslipSchema.index({ storeId: 1, staffId: 1, period: 1 }, { unique: true });

export const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>('Payslip', PayslipSchema);

export default Payslip;
`);

// 11. src/models/index.ts
writeFile('src/models/index.ts', `
export * from './User';
export * from './Store';
export * from './StoreMember';
export * from './Wallet';
export * from './CapitalContribution';
export * from './Transaction';
export * from './Staff';
export * from './CashAdvance';
export * from './Payslip';
`);

// 12. src/auth.ts
writeFile('src/auth.ts', `
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import connectToDatabase from './lib/db/mongoose';
import User from './models/User';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    Credentials({
      id: 'demo-login',
      name: 'Demo Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        name: { label: 'Nama', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        await connectToDatabase();
        const email = (credentials.email as string).toLowerCase().trim();
        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            email,
            name: (credentials.name as string) || email.split('@')[0],
            avatarUrl: '',
          });
        }
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!existingUser) {
          await User.create({
            email: user.email.toLowerCase(),
            name: user.name || user.email.split('@')[0],
            avatarUrl: user.image || '',
          });
        }
        return true;
      } catch (error) {
        console.error('Error during signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (user && user.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (dbUser) {
          token.sub = dbUser._id.toString();
          token.id = dbUser._id.toString();
          token.username = dbUser.username || null;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.avatarUrl = dbUser.avatarUrl || '';
        }
      }

      if (trigger === 'update' && session?.username) {
        token.username = session.username;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).username = token.username || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || 'ticco_dev_super_secret_session_key_32bytes_long!',
});
`);

// 13. src/lib/auth-guard.ts
writeFile('src/lib/auth-guard.ts', `
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
          message: \`Akses ditolak. Tindakan ini memerlukan peran: \${allowedRoles.join(', ')}.\`,
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
`);

// 14. src/app/api/auth/[...nextauth]/route.ts
writeFile('src/app/api/auth/[...nextauth]/route.ts', `
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
`);

console.log('All backend and model files written successfully!');
