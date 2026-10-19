#!/usr/bin/env python3
"""기념품 사진 만들기: 원본 사진을 16:9로 잘라 800x450 WebP로 저장합니다.

    python3 tools/make_gift_photos.py <원본 폴더>

PHOTOS 표의 (파일 이름, 기념품 id, 가로 초점, 세로 초점)을 바꾸면 자르는 위치가 바뀝니다.
초점은 0~1 사이 값이에요 (0.5 = 가운데). 새 사진을 넣으면 page.html의 GIFT_PHOTOS에도 id를 추가하세요.
"""
import pathlib
import sys

from PIL import Image, ImageOps

OUT = pathlib.Path(__file__).resolve().parent.parent / "site" / "img" / "gift"
W, H = 800, 450

PHOTOS = [
    ("c2099e6a-image.jpg", "coffee", 0.50, 0.40),
    ("f66279e1-image.jpg", "weasel", 0.50, 0.50),
    ("a1cb1db9-image.jpg", "lotustea", 0.50, 0.56),
    ("286b0510-image.jpg", "artichoke", 0.50, 0.56),
    ("23145a98-image.jpg", "driedfruit", 0.50, 0.50),
    ("7ddf6893-image.jpg", "cashew", 0.50, 0.50),
    ("2f371918-image.jpg", "coconutcandy", 0.50, 0.50),
    ("871335ef-image.jpg", "macadamia", 0.50, 0.46),
    ("3830f871-image.jpg", "fishsauce", 0.50, 0.44),
    ("8cfab248-image.jpg", "pepper", 0.50, 0.50),
    ("333a3efa-image.jpg", "noodles", 0.50, 0.50),
    ("c63c83e9-image.jpg", "lantern", 0.50, 0.50),
    ("4e53b542-image.jpg", "nonla", 0.50, 0.28),
    ("1433992d-image.jpg", "tailor", 0.50, 0.45),
    ("04b41453-image.jpg", "rattan", 0.50, 0.22),
]


def crop(im, fx, fy):
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
    for fname, gift, fx, fy in PHOTOS:
        im = ImageOps.exif_transpose(Image.open(pathlib.Path(src) / fname)).convert("RGB")
        im = crop(im, fx, fy).resize((W, H), Image.LANCZOS)
        out = OUT / f"{gift}.webp"
        im.save(out, "WEBP", quality=72, method=6)
        print(f"{gift:12s} {out.stat().st_size // 1024:3d} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
