from __future__ import annotations

import hashlib
import re
import json
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ITEMS_DIR = ROOT / "content" / "items"
SOURCE_PREFIX = "/archive/items/"
OUTPUT_PREFIX = "/archive/optimized/"
OUTPUT_DIR = ROOT / "public" / "archive" / "optimized"
MAX_EDGE = 1200
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def optimize_image(source: Path, destination: Path) -> tuple[int, int]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    original_size = source.stat().st_size

    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=84, method=6, exact=has_alpha)

    return original_size, destination.stat().st_size


def main() -> None:
    if not ITEMS_DIR.exists():
        print("No product records found; nothing to optimize.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    converted = 0
    total_before = 0
    total_after = 0

    for record_path in sorted(ITEMS_DIR.glob("*.json")):
        try:
            record = json.loads(record_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            print(f"Skipping {record_path.name}: {error}")
            continue

        images = record.get("images")
        was_string = isinstance(images, str)
        image_list = [images] if was_string and images else images if isinstance(images, list) else []
        updated = []
        changed = False

        for image_url in image_list:
            if not isinstance(image_url, str) or not image_url.startswith(SOURCE_PREFIX):
                updated.append(image_url)
                continue

            relative_path = unquote(image_url[len(SOURCE_PREFIX):])
            source = ROOT / "public" / "archive" / "items" / relative_path
            if not source.is_file() or source.suffix.lower() not in SUPPORTED:
                updated.append(image_url)
                continue

            identity = hashlib.sha256(image_url.encode("utf-8")).hexdigest()[:12]
            safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", source.stem).strip("-._") or "image"
            destination_name = f"{safe_stem}-{identity}.webp"
            destination = OUTPUT_DIR / destination_name
            optimized_url = f"{OUTPUT_PREFIX}{destination_name}"

            if not destination.exists():
                before, after = optimize_image(source, destination)
                total_before += before
                total_after += after
                converted += 1
                print(f"Optimized {source.name}: {before:,} -> {after:,} bytes")
            else:
                print(f"Already optimized: {source.name}")

            updated.append(optimized_url)
            changed = changed or optimized_url != image_url

        if changed:
            record["images"] = updated[0] if was_string and updated else updated
            record_path.write_text(
                json.dumps(record, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    print(f"Created {converted} optimized image(s).")
    if total_before:
        reduction = (1 - total_after / total_before) * 100
        print(f"Converted files: {total_before:,} -> {total_after:,} bytes ({reduction:.1f}% smaller).")


if __name__ == "__main__":
    main()
