import Img from "./Img";

export default function Thumb({ src, alt, label, priority, sizes, ratio = "aspect-[16/9]" }: { src?: string; alt: string; label?: string; priority?: boolean; sizes?: string; ratio?: string }) {
  return (
    <div className={`relative ${ratio} w-full overflow-hidden rounded-md bg-gradient-to-br from-red-700 to-neutral-900`}>
      {src ? (
        <Img src={src} alt={alt} priority={priority} sizes={sizes} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm font-extrabold uppercase tracking-wider text-white/90">{label || "Agentviral"}</div>
      )}
    </div>
  );
}
