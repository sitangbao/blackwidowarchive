import { Hourglass } from "./Hourglass";

export function ItemImage({ url, alt, className = "" }: { url?: string | undefined; alt: string; className?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-muted ${className}`}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#382126] via-[#291b20] to-[#1d191c]"
          role="img"
          aria-label={`${alt}（暂无图片）`}
        >
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center p-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Hourglass
                key={i}
                className={`h-1/2 w-1/2 ${i === 4 ? "scale-125 text-[#c34a55]/45" : "text-[#b32632]/20"}`}
              />
            ))}
          </div>
          <Hourglass className="relative h-[30%] w-[30%] text-[#d05a64]/70 drop-shadow-[0_0_12px_rgba(179,38,50,0.22)]" />
        </div>
      )}
    </div>
  );
}
