import { Hourglass } from "./Hourglass";

export function ItemImage({
  url,
  alt,
  className = "",
}: {
  url?: string | undefined;
  alt: string;
  className?: string;
  category?: string;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden ${className}`}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#321b20] via-[#24171b] to-[#171416]"
          role="img"
          aria-label={`${alt}（暂无图片）`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(179,38,50,0.16),transparent_68%)]" />
          <Hourglass className="relative h-[68%] w-[68%] text-[#c73543] drop-shadow-[0_0_22px_rgba(195,53,67,0.28)]" />
        </div>
      )}
    </div>
  );
}
