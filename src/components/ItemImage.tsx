import { Hourglass } from "./Hourglass";

export function ItemImage({ url, alt, className = "" }: { url?: string | undefined; alt: string; className?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-muted ${className}`}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/30">
          <Hourglass className="h-1/3 w-1/3" />
        </div>
      )}
    </div>
  );
}
