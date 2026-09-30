import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayslip extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  period: string; // 'YYYY-MM'
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
      match: /^\d{4}-\d{2}$/,
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

// Prevent duplicate payslips for the same staff in the same period within a store
PayslipSchema.index({ storeId: 1, staffId: 1, period: 1 }, { unique: true });

export const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>('Payslip', PayslipSchema);

export default Payslip;
