import { useEffect, useState } from "react";
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
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(undefined);
  const [isTransparentBadge, setIsTransparentBadge] = useState(false);

  useEffect(() => {
    setDisplayUrl(undefined);
    setIsTransparentBadge(false);
    if (!url) return;

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      try {
        const maxSide = 512;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const scanWidth = Math.max(1, Math.round(image.naturalWidth * scale));
        const scanHeight = Math.max(1, Math.round(image.naturalHeight * scale));
        const scan = document.createElement("canvas");
        scan.width = scanWidth;
        scan.height = scanHeight;
        const scanContext = scan.getContext("2d", { willReadFrequently: true });
        if (!scanContext) {
          setDisplayUrl(url);
          return;
        }
        scanContext.drawImage(image, 0, 0, scanWidth, scanHeight);
        const pixels = scanContext.getImageData(0, 0, scanWidth, scanHeight).data;

        let minX = scanWidth;
        let minY = scanHeight;
        let maxX = -1;
        let maxY = -1;
        let transparentPixels = 0;
        for (let y = 0; y < scanHeight; y++) {
          for (let x = 0; x < scanWidth; x++) {
            const alpha = pixels[(y * scanWidth + x) * 4 + 3];
            if (alpha < 250) transparentPixels++;
            if (alpha > 12) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        const totalPixels = scanWidth * scanHeight;
        const hasTransparentBackground = transparentPixels / totalPixels > 0.01;
        if (!hasTransparentBackground || maxX < minX || maxY < minY) {
          setDisplayUrl(url);
          return;
        }

        const padX = Math.max(2, Math.round((maxX - minX + 1) * 0.04));
        const padY = Math.max(2, Math.round((maxY - minY + 1) * 0.04));
        const left = Math.max(0, Math.floor((minX - padX) / scale));
        const top = Math.max(0, Math.floor((minY - padY) / scale));
        const right = Math.min(image.naturalWidth, Math.ceil((maxX + 1 + padX) / scale));
        const bottom = Math.min(image.naturalHeight, Math.ceil((maxY + 1 + padY) / scale));
        const cropWidth = right - left;
        const cropHeight = bottom - top;

        const cropped = document.createElement("canvas");
        cropped.width = cropWidth;
        cropped.height = cropHeight;
        const croppedContext = cropped.getContext("2d");
        if (!croppedContext) {
          setDisplayUrl(url);
          return;
        }
        croppedContext.drawImage(image, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        if (!cancelled) {
          setDisplayUrl(cropped.toDataURL("image/png"));
          setIsTransparentBadge(true);
        }
      } catch {
        if (!cancelled) setDisplayUrl(url);
      }
    };
    image.onerror = () => {
      if (!cancelled) setDisplayUrl(url);
    };
    image.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  const resolvedUrl = displayUrl ?? url;
  return (
    <div className={`relative aspect-square overflow-hidden bg-muted ${className}`}>
      {url ? (
        <img
          src={resolvedUrl}
          alt={alt}
          loading="lazy"
          className={isTransparentBadge ? "absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 object-contain" : "h-full w-full object-contain"}
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
