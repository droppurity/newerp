
'use server';

interface PostOffice {
  Name: string;
  Description: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

interface PincodeApiResponse {
  Message: string;
  Status: string;
  PostOffice: PostOffice[] | null;
}

export interface LocationData {
  city: string;
  state: string; // Added state as it's often useful with pincode
  country: string;
  error?: string | null;
}

export async function fetchLocationFromPincode(pincode: string): Promise<LocationData> {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return { city: '', state: '', country: '', error: 'Invalid Pincode format.' };
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return { city: '', state: '', country: '', error: `API error: ${response.statusText}` };
    }

    const data: PincodeApiResponse[] = await response.json();

    if (data && data.length > 0 && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
      const firstPostOffice = data[0].PostOffice[0];
      return {
        city: firstPostOffice.District || '', // Using District as City
        state: firstPostOffice.State || '',
        country: firstPostOffice.Country || '',
        error: null,
      };
    } else if (data && data.length > 0 && data[0].Status === 'Error') {
      console.warn('Pincode API returned an error:', data[0].Message);
      return { city: '', state: '', country: '', error: data[0].Message || 'Pincode not found or API error.' };
    } else {
      console.warn('No data found for this pincode or unexpected API response format.');
      return { city: '', state: '', country: '', error: 'No location data found for this Pincode.' };
    }
  } catch (error) {
    console.error('Failed to fetch location data:', error);
    return { city: '', state: '', country: '', error: 'Failed to fetch location data. Check network connection.' };
  }
}
