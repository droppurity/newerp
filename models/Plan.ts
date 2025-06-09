import mongoose, { Document, Schema } from 'mongoose';

export interface IPlan extends Document {
  planId: string;
  planName: string;
  durationDays: number;
  price: number;
  dailyWaterLimitLiters?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema({
  planId: { type: String, required: true, unique: true },
  planName: { type: String, required: true },
  durationDays: { type: Number, required: true },
  price: { type: Number, required: true },
  dailyWaterLimitLiters: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt field on save
PlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);