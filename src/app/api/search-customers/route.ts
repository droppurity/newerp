import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Assuming your Customer model is defined and imported like this:
// import Customer from '@/models/Customer';
// If not, define a basic schema and model here for demonstration:
const customerSchema = new mongoose.Schema({
  customerName: String,
  generatedCustomerId: String,
  customerPhone: String,
  customerAddress: String,
  landmark: String,
  pincode: String,
  city: String,
  stateName: String,
  confirmedMapLink: String,
  mapLatitude: Number,
  mapLongitude: Number,
  modelInstalled: String,
  planSelected: String,
  serialNumber: String,
  // Add other fields from your customer schema
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);


// Function to connect to the database (replace with your connection logic)
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    // Use current db connection
    return;
  }
  // Use new db connection
  await mongoose.connect(process.env.MONGODB_URI as string); // Replace with your MongoDB URI environment variable name
};

export async function GET(request: NextRequest) {
  await connectDB(); // Connect to the database

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search') || '';

  if (!searchTerm) {
    return NextResponse.json({ success: true, message: 'No search term provided', customers: [] }, { status: 200 });
  }

  // Create a case-insensitive regex for searching
  const searchRegex = new RegExp(searchTerm, 'i');

  try {
    // Search for customers matching the search term in name, ID, or phone
    const customers = await Customer.find({
      $or: [
        { customerName: searchRegex },
        { generatedCustomerId: searchRegex },
        { customerPhone: searchRegex },
      ],
    });

    return NextResponse.json({ success: true, message: 'Customers fetched successfully', customers }, { status: 200 });

  } catch (error: any) {
    console.error('Error searching customers:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to search customers' }, { status: 500 });
  }
}