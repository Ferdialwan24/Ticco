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
