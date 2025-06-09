
"use client";

interface CustomerLocationProps {
  latitude: number;
  longitude: number;
  defaultLatitude: number;
  defaultLongitude: number;
  addressQuery?: string | null; // For using city/state from pincode if precise lat/long not fetched
  zoom?: number;
  mapLabel?: string; // This will now be used for the iframe title
}

const CustomerLocation: React.FC<CustomerLocationProps> = ({
  latitude,
  longitude,
  defaultLatitude,
  defaultLongitude,
  addressQuery,
  zoom = 14,
  mapLabel = "Service Location Map", 
}) => {
  let mapQuery: string;

  if (latitude !== defaultLatitude || longitude !== defaultLongitude) {
    // If latitude or longitude are different from default, assume they've been accurately set (e.g., by GPS)
    mapQuery = `${latitude},${longitude}`;
  } else if (addressQuery) {
    // Otherwise, if an addressQuery (from pincode) is available, use that
    mapQuery = addressQuery;
  } else {
    // Fallback to default coordinates for the query
    mapQuery = `${defaultLatitude},${defaultLongitude}`;
  }

  // Construct the Google Maps embed URL
  // Using a keyless embed URL. For production, consider Google Maps Embed API with an API key.
  const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${zoom}&output=embed&t=m`;
  // t=m for map view, t=k for satellite view

  return (
    <div className="w-full aspect-video rounded-md shadow-md overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={embedMapUrl}
        title={mapLabel}
        aria-label={mapLabel}
      ></iframe>
    </div>
  );
};

export default CustomerLocation;
