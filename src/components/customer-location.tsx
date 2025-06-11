
"use client";

import Image from 'next/image'; // Import next/image

interface CustomerLocationProps {
  latitude: number;
  longitude: number;
  defaultLatitude: number;
  defaultLongitude: number;
  addressQuery?: string | null; // For using city/state from pincode if precise lat/long not fetched
  mapLabel?: string;
}

const CustomerLocation: React.FC<CustomerLocationProps> = ({
  latitude,
  longitude,
  defaultLatitude,
  defaultLongitude,
  addressQuery,
  mapLabel = "Service Location",
}) => {
  let gMapsQuery: string;

  // Determine the query for Google Maps link
  if (latitude !== defaultLatitude || longitude !== defaultLongitude) {
    // If specific coordinates are provided (not default), use them
    gMapsQuery = `${latitude},${longitude}`;
  } else if (addressQuery) {
    // If an address query (from pincode, etc.) is provided, use that
    gMapsQuery = addressQuery;
  } else {
    // Fallback to default coordinates
    gMapsQuery = `${defaultLatitude},${defaultLongitude}`;
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(gMapsQuery)}`;

  // Placeholder image dimensions
  const placeholderWidth = 600;
  const placeholderHeight = 400;

  return (
    <div className="w-full rounded-md shadow-md overflow-hidden border border-border">
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${mapLabel} on Google Maps`}>
        <div className="relative aspect-[3/2] w-full bg-muted hover:opacity-90 transition-opacity cursor-pointer">
          <Image
            src={`https://placehold.co/${placeholderWidth}x${placeholderHeight}.png`} // Using placeholder
            alt={`Static map for ${mapLabel}`}
            layout="fill" 
            objectFit="cover" 
            className="rounded-t-md" // Only round top if there's a caption below
            data-ai-hint="map location"
          />
           <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity opacity-0 hover:opacity-100">
            <p className="text-white text-lg font-semibold">View on Google Maps</p>
          </div>
        </div>
      </a>
      <p className="text-xs text-muted-foreground p-2 text-center bg-background rounded-b-md">
        Click map to open location. Map query: <span className="font-mono text-xs">{gMapsQuery}</span>
      </p>
    </div>
  );
};

export default CustomerLocation;
