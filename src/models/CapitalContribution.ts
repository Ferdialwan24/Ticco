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
