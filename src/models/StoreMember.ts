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
