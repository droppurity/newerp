
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError, FindOptions } from 'mongodb';

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

// --- MongoDB Connection Helper ---
let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (service-jobs) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }

  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) {
            await mongoClientInstance.close();
        }
        mongoClientInstance = new MongoClient(MONGODB_URI);
    }
    
    await mongoClientInstance.connect();
    const db = mongoClientInstance.db(DB_NAME);
    await db.command({ ping: 1 });
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (service-jobs) CRITICAL ERROR: Failed to connect or ping database ${DB_NAME}. Error: ${err.message}`, err);
    if (mongoClientInstance) {
      try { await mongoClientInstance.close(); } catch (closeErr) { /* ignore */ }
    }
    mongoClientInstance = null;
    cachedDbInstance = null;
    throw err; 
  }
}

async function logServiceJobAction(db: Db, jobId: ObjectId, action: string, details?: any) {
  try {
    const logCollection = db.collection('serviceJobLogs');
    await logCollection.insertOne({
      jobId,
      action,
      timestamp: new Date(),
      details: details || null,
      // userId: "system" // Placeholder for user ID when auth is more granular
    });
    console.log(`API Route (service-jobs): Logged action '${action}' for job ID '${jobId}'`);
  } catch (logError) {
    console.error(`API Route (service-jobs): Failed to log action '${action}' for job ID '${jobId}'. Error:`, logError);
    // Decide if this should throw or just log. For now, just log.
  }
}

export async function POST(request: NextRequest) {
  console.log("API Route: /api/service-jobs POST handler invoked.");

  if (!MONGODB_URI) {
    return NextResponse.json({ success: false, message: 'Server Configuration Error: Database URI not configured.' }, { status: 500 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    return NextResponse.json({ success: false, message: 'Bad Request: Invalid JSON format.', details: jsonError.message }, { status: 400 });
  }
  
  const { 
    customerId, 
    customerGeneratedId,
    customerName,
    customerPhone,
    customerAddress,
    confirmedMapLink,
    problemDescription,
  } = requestBody;

  if (!customerId || !customerGeneratedId || !customerName || !customerPhone || !problemDescription) {
    return NextResponse.json({ success: false, message: 'Bad Request: Missing required fields for service job.' }, { status: 400 });
  }

  let db;
  try {
    db = await connectToDatabase();
    const serviceJobsCollection = db.collection('serviceJobs');

    const newServiceJobDocument = {
      customerId: new ObjectId(customerId),
      customerGeneratedId,
      customerName,
      customerPhone,
      customerAddress,
      confirmedMapLink,
      problemDescription,
      status: "Open", 
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await serviceJobsCollection.insertOne(newServiceJobDocument);
    
    const createdJobId = result.insertedId;
    console.log('API Route (service-jobs): Service job created in MongoDB. Job ID:', createdJobId);

    await logServiceJobAction(db, createdJobId, "CREATED", { problem: problemDescription });
    
    const createdJob = { ...newServiceJobDocument, _id: createdJobId };

    return NextResponse.json(
        { success: true, job: createdJob, message: 'Service job created successfully.' }, 
        { status: 201 }
    );

  } catch (error: any) {
    console.error('API Route Error in /api/service-jobs POST handler:', error);
    let errorMessage = 'An unexpected error occurred while creating the service job.';
    let statusCode = 500;

    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503; 
    }
    
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}

export async function GET(request: NextRequest) {
    console.log("API Route: /api/service-jobs GET handler invoked.");
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    try {
      const db = await connectToDatabase();
      const serviceJobsCollection = db.collection('serviceJobs');
      
      let query: any = {};
      if (statusFilter) {
        query.status = statusFilter;
        console.log(`API Route (service-jobs): Fetching jobs with status: ${statusFilter}`);
      } else {
        console.log("API Route (service-jobs): Fetching jobs (no status filter).");
      }

      const findOptions: FindOptions = {
        sort: { createdAt: -1 }
      };

      if (limitParam) {
        const limit = parseInt(limitParam, 10);
        if (!isNaN(limit) && limit > 0) {
          findOptions.limit = limit;
          console.log(`API Route (service-jobs): Limiting results to ${limit}`);
        }
      }
      
      const jobs = await serviceJobsCollection.find(query, findOptions).toArray();
      
      const serializableJobs = jobs.map(job => ({
        ...job,
        _id: job._id.toString(),
        customerId: job.customerId.toString(), 
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }));
  
      return NextResponse.json({ success: true, jobs: serializableJobs }, { status: 200 });
  
    } catch (error: any) {
      console.error('API Route Error in /api/service-jobs GET handler:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch service jobs.', details: error.message || 'Unknown server error.' },
        { status: 500 }
      );
    }
  }

