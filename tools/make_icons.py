#!/usr/bin/env python3
"""사이트 아이콘(파비콘) 만들기: 빨간 원 + 금색 별 (사이트 로고와 같은 모양)

    python3 tools/make_icons.py

site/ 폴더에 favicon.svg, favicon.ico, favicon-32.png, icon-192.png, apple-touch-icon.png를 만듭니다.
다른 이미지를 쓰고 싶으면 이 파일들을 같은 이름으로 바꿔 넣으면 됩니다.
"""
import math
import pathlib

from PIL import Image, ImageDraw

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"
RED, GOLD, RING, BG = (232, 50, 42), (244, 190, 62), (229, 113, 37), (16, 13, 12)


def star_points(cx, cy, r_out, r_in):
    pts = []
    for k in range(10):
        r = r_out if k % 2 == 0 else r_in
        a = math.radians(-90 + 36 * k)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def badge(size, full_bleed=False):
    """Draw at 8x and downsample for smooth edges."""
    s = 8
    big = size * s
    img = Image.new("RGBA", (big, big), BG + (255,) if full_bleed else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = big * (0.11 if full_bleed else 0.02)
    d.ellipse([pad, pad, big - pad, big - pad], fill=RING)
    ring = big * 0.032
    d.ellipse([pad + ring, pad + ring, big - pad - ring, big - pad - ring], fill=RED)
    c = big / 2
    r_out = (big - 2 * pad) * 0.30
    d.polygon(star_points(c, c + r_out * 0.095, r_out, r_out * 0.382), fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)


def svg():
    cx, cy, ro = 32, 32 + 17 * 0.095, 17
    pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in star_points(cx, cy, ro, ro * 0.382))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
            '<circle cx="32" cy="32" r="31" fill="#E57125"/>'
            '<circle cx="32" cy="32" r="29" fill="#E8322A"/>'
            f'<polygon points="{pts}" fill="#F4BE3E"/></svg>\n')


def main():
    SITE.mkdir(exist_ok=True)
    (SITE / "favicon.svg").write_text(svg(), encoding="utf-8")
    badge(32).save(SITE / "favicon-32.png")
    badge(192).save(SITE / "icon-192.png")
    badge(180, full_bleed=True).convert("RGB").save(SITE / "apple-touch-icon.png")
    badge(256).save(SITE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons written to", SITE)


if __name__ == "__main__":
    main()
