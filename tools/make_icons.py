#!/usr/bin/env python3
"""NexCode icon generator.

Reads branding/logo-source.png and produces every Windows branding asset the
build needs, under src/stable/resources/win32 and the workbench watermark SVGs.
Run:  python tools/make_icons.py      (needs: pip install pillow numpy scipy)
"""
import base64, io, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "branding", "logo-source.png")
WIN = os.path.join(ROOT, "src", "stable", "resources", "win32")
MEDIA = os.path.join(ROOT, "src", "stable", "src", "vs", "workbench", "browser")
os.makedirs(WIN, exist_ok=True)
os.makedirs(os.path.join(MEDIA, "media"), exist_ok=True)
os.makedirs(os.path.join(MEDIA, "parts", "editor", "media"), exist_ok=True)

NAVY = (11, 18, 36)


def load_transparent_logo():
    """Cut the logo out of its dark neon-shadow background.

    The artwork body is bright (blue/purple); the surrounding glow is dark.
    Bright pixels are taken as the shape, then closed/filled so the dark
    screen and the shaded fold inside the logo stay opaque.
    """
    import numpy as np
    from scipy import ndimage as ndi

    arr = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int16)
    bright = arr.max(axis=2) >= 170
    yy, xx = np.ogrid[-34:35, -34:35]
    disk = (xx * xx + yy * yy) <= 34 * 34
    closed = ndi.binary_closing(np.pad(bright, 40), structure=disk)[40:-40, 40:-40]
    filled = ndi.binary_fill_holes(closed)
    filled = ndi.binary_erosion(filled, iterations=2)          # drop dark fringe
    alpha = ndi.gaussian_filter(filled.astype(np.float32), 1.3)
    alpha = np.clip((alpha - 0.35) / 0.4, 0, 1)
    rgba = np.dstack([arr.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
    out = out.crop(bbox)
    side = max(out.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    return sq


LOGO = load_transparent_logo()


def logo_at(size, pad=0.0):
    inner = max(1, int(size * (1 - 2 * pad)))
    l = LOGO.resize((inner, inner), Image.LANCZOS)
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c.paste(l, ((size - inner) // 2, (size - inner) // 2), l)
    return c


def save_ico(img256, path, sizes=(16, 20, 24, 32, 40, 48, 64, 96, 128, 256)):
    img256.save(path, format="ICO", sizes=[(s, s) for s in sizes])


# ---- main app icon -------------------------------------------------------
main = logo_at(256, pad=0.04)
save_ico(main, os.path.join(WIN, "code.ico"))
logo_at(70, 0.06).save(os.path.join(WIN, "code_70x70.png"))
logo_at(150, 0.06).save(os.path.join(WIN, "code_150x150.png"))
os.makedirs(os.path.join(ROOT, "branding", "out"), exist_ok=True)
logo_at(512, 0.04).save(os.path.join(ROOT, "branding", "out", "nexcode-512.png"))
logo_at(256, 0.04).save(os.path.join(ROOT, "branding", "out", "nexcode-256.png"))


# ---- file-type icons ------------------------------------------------------
TYPES = {  # file name -> (label, colour)
    "default": ("", (120, 130, 150)), "bower": ("BWR", (255, 160, 40)),
    "c": ("C", (90, 150, 220)), "config": ("CFG", (130, 140, 160)),
    "cpp": ("C++", (60, 120, 200)), "csharp": ("C#", (110, 90, 200)),
    "css": ("CSS", (45, 130, 220)), "go": ("GO", (0, 173, 216)),
    "html": ("HTML", (228, 87, 38)), "jade": ("PUG", (160, 110, 80)),
    "java": ("JAVA", (222, 95, 40)), "javascript": ("JS", (240, 200, 40)),
    "json": ("JSON", (200, 160, 40)), "less": ("LESS", (50, 80, 140)),
    "markdown": ("MD", (70, 140, 220)), "php": ("PHP", (120, 130, 190)),
    "powershell": ("PS", (40, 100, 190)), "python": ("PY", (55, 118, 170)),
    "react": ("JSX", (60, 190, 230)), "ruby": ("RB", (200, 40, 50)),
    "sass": ("SASS", (205, 100, 150)), "shell": ("SH", (90, 170, 90)),
    "sql": ("SQL", (200, 130, 60)), "typescript": ("TS", (50, 120, 200)),
    "vue": ("VUE", (65, 184, 131)), "xml": ("XML", (230, 140, 50)),
    "yaml": ("YML", (200, 70, 70)),
}


def font(px):
    for p in ("C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()


def filetype_icon(label, colour, size=256):
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = int(S * .17), int(S * .06), int(S * .83), int(S * .94)
    fold = int(S * .20)
    page = [(x0, y0), (x1 - fold, y0), (x1, y0 + fold), (x1, y1), (x0, y1)]
    d.polygon(page, fill=(250, 251, 253, 255), outline=(190, 198, 215, 255))
    d.polygon([(x1 - fold, y0), (x1, y0 + fold), (x1 - fold, y0 + fold)], fill=(215, 222, 235, 255))
    band_y0, band_y1 = int(S * .50), int(S * .74)
    d.rectangle([x0, band_y0, x1, band_y1], fill=colour + (255,))
    if label:
        f = font(int(S * (.17 if len(label) <= 3 else .13)))
        tw = d.textlength(label, font=f)
        d.text(((S - tw) / 2, band_y0 + (band_y1 - band_y0) * .5 - S * .09), label, font=f, fill=(255, 255, 255, 255))
    badge = logo_at(int(S * .30), 0.0)
    img.alpha_composite(badge, (x0 + int(S * .05), y0 + int(S * .09)))
    return img


for name, (label, colour) in TYPES.items():
    save_ico(filetype_icon(label, colour), os.path.join(WIN, f"{name}.ico"))


# ---- Inno Setup wizard images ------------------------------------------
def gradient(w, h):
    img = Image.new("RGB", (w, h))
    px = img.load()
    top, bot = (8, 14, 32), (46, 30, 110)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


BIG = {100: (164, 314), 125: (192, 386), 150: (246, 459), 175: (273, 556),
       200: (328, 604), 225: (355, 700), 250: (410, 797)}
SMALL = {100: (55, 55), 125: (64, 68), 150: (83, 80), 175: (92, 97),
         200: (110, 106), 225: (119, 123), 250: (138, 140)}
for sc, (w, h) in BIG.items():
    im = gradient(w, h).convert("RGBA")
    lg = logo_at(int(w * .66), 0.0)
    im.alpha_composite(lg, ((w - lg.width) // 2, int(h * .18)))
    d = ImageDraw.Draw(im)
    f = font(max(10, int(w * .15)))
    t = "NexCode"
    tw = d.textlength(t, font=f)
    d.text(((w - tw) / 2, int(h * .18) + lg.height + int(h * .04)), t, font=f, fill=(255, 255, 255, 255))
    f2 = font(max(8, int(w * .065)))
    t2 = "We Code Your Next"
    tw2 = d.textlength(t2, font=f2)
    d.text(((w - tw2) / 2, int(h * .18) + lg.height + int(h * .04) + int(w * .19)), t2, font=f2, fill=(170, 190, 255, 255))
    im.convert("RGB").save(os.path.join(WIN, f"inno-big-{sc}.bmp"))
for sc, (w, h) in SMALL.items():
    im = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    s = int(min(w, h) * .92)
    lg = logo_at(s, 0.0)
    im.alpha_composite(lg, ((w - s) // 2, (h - s) // 2))
    im.convert("RGB").save(os.path.join(WIN, f"inno-small-{sc}.bmp"))


# ---- workbench watermark / code-icon SVGs --------------------------------
def png_b64(img):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def svg_with(img, opacity=1.0, size=256):
    b = png_b64(img.resize((size, size), Image.LANCZOS))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            f'<image width="{size}" height="{size}" opacity="{opacity}" '
            f'xlink:href="data:image/png;base64,{b}"/></svg>\n')


def mono(color, alpha_scale):
    a = LOGO.getchannel("A").point(lambda v: int(v * alpha_scale))
    out = Image.new("RGBA", LOGO.size, color + (0,))
    out.putalpha(a)
    return out


with open(os.path.join(MEDIA, "media", "code-icon.svg"), "w") as f:
    f.write(svg_with(LOGO, 1.0, 128))
for name, (col, sc) in {"light": ((120, 130, 160), .22), "dark": ((200, 210, 240), .16),
                        "hcDark": ((255, 255, 255), .30), "hcLight": ((20, 20, 40), .30)}.items():
    with open(os.path.join(MEDIA, "parts", "editor", "media", f"letterpress-{name}.svg"), "w") as f:
        f.write(svg_with(mono(col, sc), 1.0, 256))

print("icons ok")
