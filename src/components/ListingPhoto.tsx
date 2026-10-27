// Shows a listing's photo, or a gray "No photo" box when it doesn't have one.
// The caller decides how the photo fits its box (object-cover crops, object-contain shows it whole).
export default function ListingPhoto({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  if (!src) {
    return <div className={`flex items-center justify-center bg-gray-100 text-sm text-gray-400 ${className}`}>No photo</div>;
  }
  return <img src={src} alt={alt} className={className} />;
}
