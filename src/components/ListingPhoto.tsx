import { ImageIcon } from "@phosphor-icons/react";
import { useState } from "react";

// A listing's photo, or a quiet placeholder when it has none or it won't load.
// Lazy by default; pass `eager` for the one big photo at the top of a page.
export default function ListingPhoto({ src, alt, className = "", eager = false }: { src?: string; alt: string; className?: string; eager?: boolean }) {
  const [brokenSrc, setBrokenSrc] = useState<string>();

  if (!src || src === brokenSrc) {
    return (
      <div role="img" aria-label={`${alt}, no photo`} className={`flex items-center justify-center bg-surface-2 text-muted ${className}`}>
        <ImageIcon size={28} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBrokenSrc(src)} className={`bg-surface-2 ${className}`} />;
}
