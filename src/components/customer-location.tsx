
"use client";

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface CustomerLocationProps {
  latitude: number;
  longitude: number;
  defaultLatitude: number;
  defaultLongitude: number;
  addressQuery?: string | null;
  mapLabel?: string;
  // The height prop is less directly applicable to an aspect-ratio image,
  // but we'll keep it in case styling needs to adapt based on it elsewhere.
  height?: string; 
}

const CustomerLocation: React.FC<CustomerLocationProps> = ({
  latitude,
  longitude,
  defaultLatitude,
  defaultLongitude,
  addressQuery,
  mapLabel = "Service Location",
}) => {
  let gMapsLink: string;
  let gMapsQueryText: string;

  if (latitude !== defaultLatitude || longitude !== defaultLongitude) {
    gMapsQueryText = `${latitude},${longitude}`;
    gMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
  } else if (addressQuery) {
    gMapsQueryText = addressQuery;
    gMapsLink = `https://www.google.com/maps?q=${encodeURIComponent(addressQuery)}`;
  } else {
    gMapsQueryText = `${defaultLatitude},${defaultLongitude}`;
    gMapsLink = `https://www.google.com/maps?q=${defaultLatitude},${defaultLongitude}`;
  }

  // Using a 16:9 aspect ratio for the placeholder
  const placeholderWidth = 800;
  const placeholderHeight = 450;

  return (
    <div className="my-4">
      <div className="relative w-full aspect-w-16 aspect-h-9 rounded-md shadow-md overflow-hidden border border-border group">
        <a
          href={gMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View location for ${mapLabel} on Google Maps`}
          className="block w-full h-full"
        >
          <Image
            src={`https://placehold.co/${placeholderWidth}x${placeholderHeight}.png`}
            alt={mapLabel || 'Map placeholder linking to Google Maps'}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="map location"
            priority // Consider adding priority if this is above the fold
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
            <ExternalLink className="h-10 w-10 sm:h-12 sm:w-12 text-white mb-2" />
            <p className="text-white text-center font-semibold text-sm sm:text-base">View on Google Maps</p>
            <p className="text-white text-xs text-center mt-1 hidden sm:block">Click map to open location in a new tab.</p>
          </div>
        </a>
      </div>
      <p className="text-xs text-muted-foreground p-2 text-center bg-card rounded-b-md -mt-0 shadow-sm border border-t-0 border-border">
        Map Location Query: <span className="font-mono text-xs">{gMapsQueryText}</span>
      </p>
    </div>
  );
};

export default CustomerLocation;
