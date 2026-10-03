#!/usr/bin/env python3
"""메뉴 사진 만들기: 원본 사진을 4:3으로 잘라 640x480 WebP로 저장합니다.

    python3 tools/make_food_photos.py <원본 폴더>

PHOTOS 표의 (파일 이름, 메뉴 id, 가로 초점, 세로 초점)을 바꾸면 자르는 위치가 바뀝니다.
초점은 0~1 사이 값이에요 (0.5 = 가운데).
"""
import pathlib
import sys

from PIL import Image, ImageOps

OUT = pathlib.Path(__file__).resolve().parent.parent / "site" / "img" / "food"
W, H = 640, 480

PHOTOS = [
    ("a4540894-image.jpg", "goicuon", 0.42, 0.50),
    ("4d4349ce-image.jpg", "phoga", 0.58, 0.50),
    ("f510cae5-image.jpg", "banhmi", 0.50, 0.50),
    ("d81f4889-image.jpg", "phobo", 0.50, 0.50),
    ("e6fc2d8e-image.jpg", "buncha", 0.50, 0.68),
    ("c7b9d6ff-image.jpg", "caphemuoi", 0.50, 0.74),
    ("d57a1194-image.jpg", "caolau", 0.40, 0.50),
    ("ba34b912-image.jpg", "caphesuada", 0.50, 0.66),
    ("51a90ffd-image.jpg", "comtam", 0.50, 0.60),
    ("5c7d58d2-image.jpg", "comga", 0.50, 0.50),
    ("480dc5e3-image.jpg", "banhxeo", 0.45, 0.50),
    ("5e81eeef-image.jpg", "nuocmia", 0.42, 0.50),
    ("5f6b071e-image.jpg", "bia", 0.50, 0.60),
    ("8c4a085f-image.jpg", "sinhtobo", 0.50, 0.52),
    ("10fbc770-image.jpg", "caphetrung", 0.50, 0.50),
    ("fc4aa192-image.jpg", "chagio", 0.50, 0.57),
    ("e2d88d2d-image.jpg", "miquang", 0.50, 0.50),
    ("4b05d6cf-image.jpg", "bunbohue", 0.55, 0.50),
]


def crop_43(im, fx, fy):
    w, h = im.size
    if w / h > W / H:
        cw, ch = round(h * W / H), h
    else:
        cw, ch = w, round(w * H / W)
    x = min(max(round(fx * w - cw / 2), 0), w - cw)
    y = min(max(round(fy * h - ch / 2), 0), h - ch)
    return im.crop((x, y, x + cw, y + ch))


def main(src):
    OUT.mkdir(parents=True, exist_ok=True)
    for fname, dish, fx, fy in PHOTOS:
        im = ImageOps.exif_transpose(Image.open(pathlib.Path(src) / fname)).convert("RGB")
        im = crop_43(im, fx, fy).resize((W, H), Image.LANCZOS)
        out = OUT / f"{dish}.webp"
        im.save(out, "WEBP", quality=74, method=6)
        print(f"{dish:12s} {out.stat().st_size // 1024:3d} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
