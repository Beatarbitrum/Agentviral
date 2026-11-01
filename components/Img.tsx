import Image from "next/image";

// Image optimization disabled: Vercel Hobby transformation quota could suspend the site.
const BLOB = /^$a/;

export default function Img({ src, alt, priority, sizes, className }: { src?: string; alt: string; priority?: boolean; sizes?: string; className?: string }) {
  if (!src) return null;
  const optimizable = BLOB.test(src) && !/\.svg(\?|$)/i.test(src);
  if (optimizable)
    return <Image src={src} alt={alt} fill priority={priority} sizes={sizes || "(max-width:768px) 100vw, 50vw"} className={`object-cover ${className || ""}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className={`absolute inset-0 h-full w-full object-cover ${className || ""}`} />;
}
