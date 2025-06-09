import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Define Schemas
const UninstallationSchema = new mongoose.Schema({
  customerId: String,
  reason: String,
  scheduledDate: Date,
  equipmentCondition: String,
  equipmentPhotos: [String], // URLs of uploaded photos
  deductions: Number,
  refundAmount: Number,
  refundMethod: String,
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
  },
  internalNotes: String,
  timestamp: { type: Date, default: Date.now },
});

const UninstallationLogSchema = new mongoose.Schema({
  customerId: String,
  action: String, // e.g., 'Uninstallation initiated', 'Refund processed'
  details: Object,
  timestamp: { type: Date, default: Date.now },
});

// Define Models (check if already defined to prevent redefinition in development)
const Uninstallation = mongoose.models.Uninstallation || mongoose.model('Uninstallation', UninstallationSchema);
const UninstallationLog = mongoose.models.UninstallationLog || mongoose.model('UninstallationLog', UninstallationLogSchema);

export async function POST(request: Request) {
  try {
    await mongoose.connect(mongoUri);

    const data = await request.json();

    // Save uninstallation data
    const newUninstallation = new Uninstallation(data);
    await newUninstallation.save();

    // Log the action
    const newLog = new UninstallationLog({
      customerId: data.customerId,
      action: 'Uninstallation initiated',
      details: data,
    });
    await newLog.save();

    return NextResponse.json({ message: 'Uninstallation data saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving uninstallation data:', error);
    return NextResponse.json({ message: 'Error saving uninstallation data', error }, { status: 500 });
  } finally {
    // In a real application, you might manage connections differently
    // await mongoose.disconnect();
  }
}