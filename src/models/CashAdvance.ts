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
  settledAtPeriod?: string; // e.g., '2026-09'
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
      match: /^\d{4}-\d{2}$/,
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
