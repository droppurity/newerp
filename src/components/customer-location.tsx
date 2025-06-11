
"use client";

interface CustomerLocationProps {
  latitude: number;
  longitude: number;
  defaultLatitude: number; // To know if we are using default or actual coordinates
  defaultLongitude: number;
  addressQuery?: string | null;
  mapLabel?: string;
  height?: string; // Allow custom height for the map
}

const CustomerLocation: React.FC<CustomerLocationProps> = ({
  latitude,
  longitude,
  defaultLatitude,
  defaultLongitude,
  addressQuery,
  mapLabel = "Service Location",
  height = "400px", // Default height for the map iframe
}) => {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let gMapsQuery: string;

  if (latitude !== defaultLatitude || longitude !== defaultLongitude) {
    // If specific coordinates are provided (not default), use them
    gMapsQuery = `${latitude},${longitude}`;
  } else if (addressQuery) {
    // If an address query (from pincode, etc.) is provided, use that
    gMapsQuery = addressQuery;
  } else {
    // Fallback to default coordinates if no specific addressQuery
    gMapsQuery = `${defaultLatitude},${defaultLongitude}`;
  }

  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}&q=${encodeURIComponent(gMapsQuery)}`;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full p-4 my-4 border border-destructive rounded-md bg-destructive/10 text-destructive-foreground text-center">
        <p className="font-semibold">Google Maps API Key Missing</p>
        <p className="text-sm">
          To display the map, please obtain a Google Maps API key, enable the "Maps Embed API",
          and add your key as <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to the <code>.env.local</code> file.
          Then, restart your development server.
        </p>
        <p className="text-xs mt-2">Map query would be for: {gMapsQuery}</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md shadow-md overflow-hidden border border-border my-4">
      <iframe
        width="100%"
        style={{ border: 0, height: height }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={mapEmbedUrl}
        title={mapLabel}
        aria-label={mapLabel}
      ></iframe>
      <p className="text-xs text-muted-foreground p-2 text-center bg-background rounded-b-md">
        Map query: <span className="font-mono text-xs">{gMapsQuery}</span>
      </p>
    </div>
  );
};

export default CustomerLocation;
