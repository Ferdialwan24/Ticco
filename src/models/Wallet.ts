import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  name: string;
  type: 'cash' | 'bank' | 'ewallet';
  bankCode?: string | null;
  accountNumber?: string | null;
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
    type: {
      type: String,
      enum: ['cash', 'bank', 'ewallet'],
      default: 'cash',
    },
    bankCode: {
      type: String,
      default: null,
      trim: true,
    },
    accountNumber: {
      type: String,
      default: null,
      trim: true,
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
