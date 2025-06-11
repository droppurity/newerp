
// src/app/api/test-recharge/route.ts
import { type NextRequest, NextResponse } from 'next/server';

// The URL of your live Netlify recharge function
const NETLIFY_RECHARGE_FUNCTION_URL = 'https://droperp.netlify.app/.netlify/functions/recharge';
// The secret key your Netlify function expects (ensure this matches what's in functions/recharge.js)
const FUNCTION_SECRET_KEY = '1234';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json(
      { success: false, message: 'Bad Request: customerId query parameter is required.' },
      { status: 400 }
    );
  }

  console.log(`API Route (test-recharge): Testing Netlify recharge function for customerId: ${customerId}`);

  try {
    const targetUrl = `${NETLIFY_RECHARGE_FUNCTION_URL}?customerId=${encodeURIComponent(customerId)}`;
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FUNCTION_SECRET_KEY}`,
        'Content-Type': 'application/json', // Good practice, though not strictly needed for GET
      },
    });

    // Get the response body as JSON
    const responseData = await response.json();

    // Forward the status code and body from the Netlify function's response
    return NextResponse.json(responseData, { status: response.status });

  } catch (error: any) {
    console.error('API Route Error in /api/test-recharge GET handler:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error proxying to Netlify function.', details: error.message },
      { status: 500 }
    );
  }
}
