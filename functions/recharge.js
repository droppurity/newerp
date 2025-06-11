
// functions/recharge.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const secretKey = process.env.SECRET_KEY;
const dbName = process.env.DB_NAME || 'droppurityDB';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    // Ensure the connection is still active if possible, or simply return cachedDb
    // For MongoClient, the instance itself holds the pool.
    // A more robust check might involve client.topology.isConnected() if you cache the client
    return cachedDb;
  }
   if (!uri) {
    console.error('RECHARGE.JS: MONGODB_URI is not defined in environment variables.');
    throw new Error('MONGODB_URI is not defined.');
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  cachedDb = db; // Cache the db instance
  console.log('RECHARGE.JS: Successfully connected to MongoDB and cached DB instance.');
  return db;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // Important for persistent connections
  console.log('RECHARGE.JS: Function invoked. Method:', event.httpMethod, 'Path:', event.path);

  if (event.httpMethod !== 'GET') {
    console.log('RECHARGE.JS: Method Not Allowed. Only GET is accepted.');
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed. Only GET is accepted.' }), headers: { 'Content-Type': 'application/json' } };
  }

  const authHeader = event.headers.authorization;
   if (!secretKey) {
    console.error('RECHARGE.JS: SERVER ERROR - SECRET_KEY is not set in Netlify environment variables.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error: API key not set.' }), headers: { 'Content-Type': 'application/json' } };
  }
  // Using your temporary secret key "1234"
  if (!authHeader || authHeader !== `Bearer 1234`) { 
    console.warn('RECHARGE.JS: Unauthorized access attempt. Invalid or missing API key. Auth Header Received:', authHeader ? authHeader.substring(0,15) + '...' : 'NONE');
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Invalid or missing API key.' }), headers: { 'Content-Type': 'application/json' } };
  }
  console.log('RECHARGE.JS: Authorization successful.');

  const customerId = event.queryStringParameters && event.queryStringParameters.customerId; // This is generatedCustomerId

  if (!customerId) {
    console.warn('RECHARGE.JS: Bad Request - customerId query parameter is required.');
    return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: customerId query parameter is required.' }), headers: { 'Content-Type': 'application/json' } };
  }
  console.log('RECHARGE.JS: Request for customerId:', customerId);

  try {
    const db = await connectToDatabase();
    const customersCollection = db.collection('customers'); 

    // Find customer by generatedCustomerId (which is what the ESP uses)
    const customerData = await customersCollection.findOne({ generatedCustomerId: customerId });

    if (!customerData) {
      console.warn(`RECHARGE.JS: Customer with generated ID ${customerId} not found.`);
      return {
        statusCode: 404, // This 404 is *from within the function*, meaning customer not found in DB
        body: JSON.stringify({ message: `Customer with generated ID ${customerId} not found.` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    console.log('RECHARGE.JS: Customer data found:', customerData.customerName, customerData.generatedCustomerId);
    console.log('RECHARGE.JS: Customer plan details from DB - espCycleMaxHours:', customerData.espCycleMaxHours, 'espCycleMaxDays:', customerData.espCycleMaxDays);


    // Update last contact timestamp for this customer
    try {
        const updateResult = await customersCollection.updateOne(
          { generatedCustomerId: customerId },
          { $set: { lastContact: new Date(), updatedAt: new Date() } }
        );
        if (updateResult.modifiedCount > 0) {
            console.log('RECHARGE.JS: Updated lastContact for customer:', customerId);
        } else if (updateResult.matchedCount === 0) {
            console.warn('RECHARGE.JS: Could not update lastContact, customer not found during update for ID:', customerId);
        } else {
             console.log('RECHARGE.JS: lastContact for customer', customerId, 'was already current or no change made.');
        }
    } catch (updateError) {
        console.error('RECHARGE.JS: Error updating lastContact for customer:', customerId, updateError);
        // Non-fatal error, proceed with returning data
    }
    
    const responseBody = {
        customerId: customerData.generatedCustomerId, 
        maxHours: customerData.espCycleMaxHours !== undefined ? customerData.espCycleMaxHours : 0, 
        maxDays: customerData.espCycleMaxDays !== undefined ? customerData.espCycleMaxDays : 0,
    };
    console.log('RECHARGE.JS: Responding with:', responseBody);
    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('RECHARGE.JS: Catch block error in recharge function:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error fetching recharge data for ESP.', details: error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
    

    