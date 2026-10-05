"""TaklifnomaBot uchun avatar (640x640) va tavsif rasmi (640x360)."""
import math
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
TOP = (255, 107, 157)     # pushti
BOTTOM = (123, 47, 247)   # binafsha
HEART = (239, 51, 99)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def gradient(w, h):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w * 0.35 + y / h * 0.65)
            px[x, y] = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
    return img


def glow(img, cx, cy, r, alpha=70):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.45))
    img.alpha_composite(layer)


def heart_points(cx, cy, size):
    pts = []
    for i in range(240):
        t = 2 * math.pi * i / 240
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 32, cy - y * size / 32 - size * 0.05))
    return pts


def sparkle(draw, cx, cy, r, alpha=230):
    k = r * 0.22
    pts = [(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k),
           (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)]
    draw.polygon(pts, fill=(255, 255, 255, alpha))


def envelope(img, cx, cy, w, h):
    """Yopiq konvert + yurakcha muhr."""
    S = img.size[0]
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    rad = h * 0.09
    # soya
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0, y0 + h * 0.08, x1, y1 + h * 0.10), rad, fill=(60, 10, 90, 110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(h * 0.08)))

    body = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle((x0, y0, x1, y1), rad, fill=(255, 255, 255, 255))
    # pastki qanotlar (biroz pushtiroq)
    d.polygon([(x0, y1), (cx, cy + h * 0.02), (x1, y1)], fill=(255, 236, 243, 255))
    d.polygon([(x0, y0 + rad), (cx - w * 0.06, cy + h * 0.05), (x0, y1 - rad)], fill=(255, 243, 247, 255))
    d.polygon([(x1, y0 + rad), (cx + w * 0.06, cy + h * 0.05), (x1, y1 - rad)], fill=(255, 243, 247, 255))
    # yuqori qopqoq
    d.polygon([(x0 + rad * 0.3, y0 + rad * 0.3), (cx, cy + h * 0.16), (x1 - rad * 0.3, y0 + rad * 0.3)],
              fill=(255, 225, 236, 255))
    lw = max(2, int(S * 0.006))
    d.line([(x0 + rad * 0.3, y0 + rad * 0.3), (cx, cy + h * 0.16), (x1 - rad * 0.3, y0 + rad * 0.3)],
           fill=(246, 170, 198, 255), width=lw, joint="curve")
    # mask bilan burchaklarni yumaloqlash
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), rad, fill=255)
    clipped = Image.new("RGBA", img.size, (0, 0, 0, 0))
    clipped.paste(body, (0, 0), mask)
    img.alpha_composite(clipped)

    # yurak muhr
    hs = h * 0.42
    hx, hy = cx, cy + h * 0.17
    hl = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.polygon(heart_points(hx, hy + hs * 0.06, hs * 1.02), fill=(150, 20, 60, 90))
    hl = hl.filter(ImageFilter.GaussianBlur(hs * 0.06))
    hd = ImageDraw.Draw(hl)
    hd.polygon(heart_points(hx, hy, hs), fill=HEART + (255,))
    # yaltiroq nuqta
    hd.ellipse((hx - hs * 0.30, hy - hs * 0.30, hx - hs * 0.12, hy - hs * 0.15), fill=(255, 255, 255, 150))
    img.alpha_composite(hl)


def avatar(size=640, ss=3):
    S = size * ss
    img = gradient(S, S).convert("RGBA")
    glow(img, S * 0.5, S * 0.46, S * 0.36, 80)
    envelope(img, S * 0.5, S * 0.53, S * 0.56, S * 0.38)
    d = ImageDraw.Draw(img)
    sparkle(d, S * 0.27, S * 0.27, S * 0.045)
    sparkle(d, S * 0.75, S * 0.25, S * 0.06)
    sparkle(d, S * 0.78, S * 0.78, S * 0.035, 200)
    sparkle(d, S * 0.22, S * 0.74, S * 0.028, 180)
    return img.resize((size, size), Image.LANCZOS).convert("RGB")


def banner(w=640, h=360, ss=3):
    W, H = w * ss, h * ss
    img = gradient(W, H).convert("RGBA")
    glow(img, W * 0.23, H * 0.5, H * 0.40, 80)
    envelope(img, W * 0.23, H * 0.53, H * 0.58, H * 0.40)
    d = ImageDraw.Draw(img)
    sparkle(d, W * 0.08, H * 0.2, H * 0.05)
    sparkle(d, W * 0.40, H * 0.18, H * 0.065)
    sparkle(d, W * 0.42, H * 0.82, H * 0.035, 200)

    tx, max_w = W * 0.475, W * 0.49

    def fit(path, size, texts):
        while True:
            font = ImageFont.truetype(path, int(size))
            if max(d.textlength(t, font=font) for t in texts) <= max_w:
                return font
            size *= 0.96

    title = fit(FONT_BOLD, H * 0.115, ["TaklifnomaBot"])
    lines = ["Chiroyli taklifnoma yarating", "va istalgan chatga yuboring.", "", "To'y · Tug'ilgan kun · Uchrashuv"]
    sub = fit(FONT, H * 0.058, lines)
    d.text((tx, H * 0.27), "TaklifnomaBot", font=title, fill=(255, 255, 255))
    y = H * 0.47
    for line in lines:
        d.text((tx, y), line, font=sub, fill=(255, 255, 255, 235))
        y += H * 0.085
    return img.resize((w, h), Image.LANCZOS).convert("RGB")


avatar().save(f"{OUT}/avatar.png", optimize=True)
banner().save(f"{OUT}/description.png", optimize=True)
print("ok")
