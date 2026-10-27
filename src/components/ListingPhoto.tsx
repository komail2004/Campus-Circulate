import { useState } from "react";

// Shows a listing's photo, or a gray "No photo" box when it doesn't have one (or it won't load,
// e.g. a photo uploaded on Sell only lasts until the page is refreshed).
// The caller decides how the photo fits its box (object-cover crops, object-contain shows it whole).
export default function ListingPhoto({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [brokenSrc, setBrokenSrc] = useState<string>();

  if (!src || src === brokenSrc) {
    return <div className={`flex items-center justify-center bg-gray-100 text-sm text-gray-400 ${className}`}>No photo</div>;
  }
  return <img src={src} alt={alt} onError={() => setBrokenSrc(src)} className={className} />;
}
