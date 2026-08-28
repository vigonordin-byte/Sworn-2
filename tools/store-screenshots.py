#!/usr/bin/env python3
"""Resize App Store screenshots to the exact sizes App Store Connect accepts.

Screenshots come out of an image generator at whatever size it feels like, and
App Store Connect rejects anything that is not one of its listed dimensions to
the pixel. Cropping to fit would eat the headline and stretching would distort
the device, so each image is scaled to fit and the remainder is padded with the
colour already in its corner — invisible against a flat background, which is
what these designs are.

    python3 tools/store-screenshots.py <input-dir> [output-dir]
"""
import sys, pathlib
from PIL import Image

# 6.9" is the slot Apple wants filled and it covers every iPhone size. 6.5" is
# produced too, because App Store Connect will ask for whichever tab you happen
# to be standing in and being blocked on an upload is worse than a spare file.
SIZES = {"6.9-inch_1290x2796": (1290, 2796),
         "6.5-inch_1284x2778": (1284, 2778)}

# Anything roughly portrait-phone shaped. Keeps stray desktop clutter out.
MIN_RATIO, MAX_RATIO = 0.40, 0.62


def fit(img, target):
    tw, th = target
    scale = min(tw / img.width, th / img.height)
    small = img.resize((max(1, round(img.width * scale)),
                        max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", target, img.convert("RGB").getpixel((0, 0)))
    canvas.paste(small, ((tw - small.width) // 2, (th - small.height) // 2))
    return canvas


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = pathlib.Path(sys.argv[1]).expanduser()
    out = pathlib.Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else src / "app-store"

    done = 0
    for path in sorted(src.iterdir()):
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        try:
            img = Image.open(path)
        except Exception:
            continue
        ratio = img.width / img.height
        if not (MIN_RATIO <= ratio <= MAX_RATIO):
            continue
        for label, target in SIZES.items():
            folder = out / label
            folder.mkdir(parents=True, exist_ok=True)
            fit(img, target).save(folder / f"{path.stem}.png")
        print(f"{path.name}  {img.width}x{img.height}  ->  ok")
        done += 1

    print(f"\n{done} image(s) written to {out}")
    if not done:
        print("Nothing matched. Are the screenshots in that folder?")


if __name__ == "__main__":
    main()
