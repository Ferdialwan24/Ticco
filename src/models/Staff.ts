import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffStatus = 'active' | 'inactive';

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  name: string;
  baseSalary: number;
  allowances: number;
  status: StaffStatus;
  userId?: mongoose.Types.ObjectId; // Optional link to User for self-service payslip
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
