
import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, MongoError } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'droppurityDB';

let mongoClientInstance: MongoClient | null = null;
let cachedDbInstance: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDbInstance && mongoClientInstance?.topology?.isConnected()) {
    return cachedDbInstance;
  }
  if (!MONGODB_URI) {
    console.error('API Route (service-jobs/[jobId]) CRITICAL ERROR: MONGODB_URI not found.');
    throw new Error('MONGODB_URI not found.');
  }
  try {
    if (!mongoClientInstance || !mongoClientInstance.topology || !mongoClientInstance.topology.isConnected()) {
        if (mongoClientInstance) await mongoClientInstance.close();
        mongoClientInstance = new MongoClient(MONGODB_URI);
    }
    await mongoClientInstance.connect();
    const db = mongoClientInstance.db(DB_NAME);
    await db.command({ ping: 1 });
    cachedDbInstance = db;
    return db;
  } catch (err: any) {
    console.error(`API Route (service-jobs/[jobId]) CRITICAL ERROR: DB connection. ${err.message}`, err);
    if (mongoClientInstance) try { await mongoClientInstance.close(); } catch (e) {}
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
    });
    console.log(`API Route (service-jobs/[jobId]): Logged action '${action}' for job ID '${jobId}'`);
  } catch (logError) {
    console.error(`API Route (service-jobs/[jobId]): Failed to log action '${action}' for job ID '${jobId}'. Error:`, logError);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  console.log(`API Route: /api/service-jobs/${jobId} PUT handler invoked.`);

  if (!jobId || !ObjectId.isValid(jobId)) {
    return NextResponse.json({ success: false, message: 'Invalid Job ID provided.' }, { status: 400 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { status } = requestBody;

  if (status !== 'Resolved') { 
    return NextResponse.json({ success: false, message: `Invalid status update: '${status}'. Only 'Resolved' is currently supported.` }, { status: 400 });
  }

  let db;
  try {
    db = await connectToDatabase();
    const serviceJobsCollection = db.collection('serviceJobs');
    const objectId = new ObjectId(jobId);

    const result = await serviceJobsCollection.updateOne(
      { _id: objectId },
      { $set: { status: 'Resolved', updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Job not found.' }, { status: 404 });
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) {
      return NextResponse.json({ success: true, message: 'Job status was already resolved.', job: await serviceJobsCollection.findOne({_id: objectId}) }, { status: 200 });
    }

    console.log(`API Route (service-jobs/[jobId]): Job ID '${jobId}' updated to status 'Resolved'.`);
    
    await logServiceJobAction(db, objectId, "RESOLVED", { newStatus: "Resolved" });

    const updatedJob = await serviceJobsCollection.findOne({_id: objectId});

    return NextResponse.json({ success: true, message: 'Job resolved successfully.', job: updatedJob }, { status: 200 });

  } catch (error: any) {
    console.error(`API Route Error in /api/service-jobs/${jobId} PUT handler:`, error);
    let errorMessage = 'An unexpected error occurred while updating the job.';
    let statusCode = 500;
    if (error instanceof MongoError) {
        errorMessage = 'Database operation failed.';
        statusCode = 503;
    }
    return NextResponse.json({ success: false, message: errorMessage, details: error.message }, { status: statusCode });
  }
}
