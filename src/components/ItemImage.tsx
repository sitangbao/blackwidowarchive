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
        // Work on a reasonably sized copy so large uploads do not consume
        // excessive memory on mobile devices.
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          setDisplayUrl(url);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const total = width * height;
        let hadTransparency = false;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 250) { hadTransparency = true; break; }
        }

        const isNearWhite = (index: number) => {
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          return Math.min(r, g, b) > 230 && Math.max(r, g, b) - Math.min(r, g, b) < 22;
        };

        // Only remove white when the corners strongly suggest a white studio background.
        const cornerPoints = [
          [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        ];
        const whiteCorners = cornerPoints.filter(([cx, cy]) => {
          let matches = 0;
          for (let oy = 0; oy < 5; oy++) {
            for (let ox = 0; ox < 5; ox++) {
              const x = cx === 0 ? ox : width - 1 - ox;
              const y = cy === 0 ? oy : height - 1 - oy;
              if (x < width && y < height && isNearWhite((y * width + x) * 4)) matches++;
            }
          }
          return matches >= 18;
        }).length;

        const visited = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;
        const add = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const pixel = y * width + x;
          if (visited[pixel]) return;
          const index = pixel * 4;
          if (pixels[index + 3] < 250 || !isNearWhite(index)) return;
          visited[pixel] = 1;
          queue[tail++] = pixel;
        };

        if (whiteCorners >= 2) {
          for (let x = 0; x < width; x++) {
            add(x, 0);
            add(x, height - 1);
          }
          for (let y = 0; y < height; y++) {
            add(0, y);
            add(width - 1, y);
          }
          while (head < tail) {
            const pixel = queue[head++];
            const x = pixel % width;
            const y = Math.floor(pixel / width);
            const index = pixel * 4;
            const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
            pixels[index + 3] = Math.max(0, Math.min(255, Math.round((255 - brightness) / 25 * 255)));
            add(x - 1, y);
            add(x + 1, y);
            add(x, y - 1);
            add(x, y + 1);
          }
        }

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            if (pixels[index + 3] > 12) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          setDisplayUrl(url);
          return;
        }
        const padX = Math.max(2, Math.round((maxX - minX + 1) * 0.035));
        const padY = Math.max(2, Math.round((maxY - minY + 1) * 0.035));
        const left = Math.max(0, minX - padX);
        const top = Math.max(0, minY - padY);
        const cropWidth = Math.min(width - left, maxX - minX + 1 + padX * 2);
        const cropHeight = Math.min(height - top, maxY - minY + 1 + padY * 2);
        const output = document.createElement("canvas");
        output.width = cropWidth;
        output.height = cropHeight;
        const outputContext = output.getContext("2d");
        if (!outputContext) {
          setDisplayUrl(url);
          return;
        }
        outputContext.putImageData(imageData, -left, -top);
        if (!cancelled) {
          setDisplayUrl(output.toDataURL("image/png"));
          setIsTransparentBadge(hadTransparency || tail > 0);
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
