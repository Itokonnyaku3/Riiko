# -*- coding: utf-8 -*-
"""
=========================================================
 スプライトシート → マップの パーツ（透過PNG）
=========================================================
 tools/asset_*.jpg（白い せなかの スプライトシート）から
 パーツを 1つずつ 切りだして assets/parts/*.png に ほぞんし、
 js/assets-data.js（パーツの 一らん）を つくる。

 つかいかた:
     python tools/build-assets.py

 あたらしい シートを ふやす とき:
     1) tools/ に 画ぞうを おく
     2) SHEETS に ファイル名と パーツの ばしょ（x,y,w,h）を 書く
        ばしょが わからない ときは --scan を つけて 走らせると
        じどうで みつけて 番ごう入りの 下しらべ画ぞうを だす。
             python tools/build-assets.py --scan
=========================================================
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
OUT_DIR = os.path.join(ROOT, "assets", "parts")
OUT_JS = os.path.join(ROOT, "js", "assets-data.js")

# =========================================================
#  パーツ一らん
# =========================================================
#  box  : シートの どこか（x, y, よこ, たて）
#  id   : マップデータに のこる 名まえ（かえると 古いマップが 見えなくなる）
#  size : ゲームの中での たての 大きさ（よこは 絵の かたちから きまる）
#  r    : ぶつかる まるの 大きさ。0 なら すりぬける「かざり」
#  em   : 絵が よみこめない ときの 代わりの 絵文字
#  さいごに "opaque"（四かくの まま）や "main"（大きい かたまりだけ）を たせる
# =========================================================
SHEETS = [
    {
        "file": "asset_trees_forest_1785938103313.jpg",
        "thr": 232,
        "parts": [
            # ---- 木 ----
            ((5, 16, 190, 236),    "tree-big",     "大きい き",        "tree",  30, 112, "🌳"),
            ((200, 52, 152, 198),  "tree",         "き",               "tree",  26, 94,  "🌳"),
            ((362, 62, 146, 184),  "tree2",        "き2",              "tree",  26, 88,  "🌳"),
            ((515, 71, 120, 176),  "tree-small",   "小さい き",        "tree",  22, 76,  "🌳"),
            ((3, 635, 128, 139),   "tree3",        "き3",              "tree",  24, 72,  "🌳"),
            ((138, 640, 116, 163), "tree4",        "き4",              "tree",  24, 80,  "🌳"),
            ((3, 786, 128, 158),   "tree5",        "き5",              "tree",  24, 82,  "🌳"),
            ((139, 812, 112, 132), "tree6",        "き6",              "tree",  22, 70,  "🌳"),
            ((644, 5, 120, 241),   "fir-big",      "大きい もみのき",  "tree",  26, 116, "🌲"),
            ((259, 726, 123, 218), "fir-tall",     "たかい もみのき",  "tree",  24, 106, "🌲"),
            ((780, 52, 104, 195),  "fir",          "もみのき",         "tree",  24, 96,  "🌲"),
            ((390, 758, 115, 186), "fir2",         "もみのき2",        "tree",  22, 92,  "🌲"),
            ((915, 102, 89, 144),  "fir-small",    "小さい もみのき",  "tree",  20, 74,  "🌲"),
            # ---- きりかぶ・しげみ ----
            ((516, 708, 119, 108), "stump",        "きりかぶ",         "plant", 18, 46,  "🪵"),
            ((646, 714, 116, 102), "stump2",       "きりかぶ2",        "plant", 18, 44,  "🪵"),
            ((773, 722, 119, 92),  "stump3",       "われた きりかぶ",  "plant", 18, 40,  "🪵"),
            ((900, 708, 116, 100), "bush-white",   "しろい花の しげみ", "plant", 18, 44, "🌼"),
            ((517, 837, 116, 99),  "bush-red",     "あかい花の しげみ", "plant", 18, 44, "🌺"),
            ((646, 837, 115, 99),  "bush-blue",    "あおい花の しげみ", "plant", 18, 44, "🪻"),
            ((772, 837, 117, 99),  "bush-yellow",  "きいろ花の しげみ", "plant", 18, 44, "🌻"),
            ((899, 834, 121, 107), "bush-berry",   "みのなる しげみ",   "plant", 18, 46, "🍒"),
            # ---- たおれ木・いわ・くさ ----
            ((8, 950, 120, 70),    "log-moss",     "こけの まるた",    "plant", 20, 52,  "🪵"),
            ((515, 953, 120, 62),  "log",          "まるた",           "plant", 20, 48,  "🪵"),
            ((138, 949, 113, 71),  "rocks-moss",   "こけの いわ",      "rock",  20, 46,  "🪨"),
            ((646, 952, 116, 66),  "rocks",        "いわ",             "rock",  20, 44,  "🪨"),
            ((264, 954, 68, 58),   "stone",        "いし",             "rock",  14, 32,  "🪨"),
            ((348, 956, 68, 62),   "grass-tuft",   "くさ",             "plant", 0,  32,  "🌿"),
            ((779, 953, 59, 57),   "grass-tuft2",  "くさ2",            "plant", 0,  30,  "🌿"),
            ((440, 962, 55, 51),   "grass-small",  "小さい くさ",      "plant", 0,  26,  "☘️"),
            ((871, 966, 47, 44),   "leaf",         "はっぱ",           "plant", 0,  22,  "🍃"),
        ],
    },
    {
        "file": "asset_rocks_paths_objects_1785938127994.jpg",
        "thr": 215,
        "parts": [
            # ---- いわ ----
            ((122, 25, 65, 55),    "rock-a",       "いし A",           "rock",  16, 36,  "🪨"),
            ((222, 20, 70, 65),    "rock-b",       "いし B",           "rock",  16, 38,  "🪨"),
            ((117, 125, 76, 57),   "rock-c",       "いし C",           "rock",  16, 36,  "🪨"),
            ((10, 217, 77, 78),    "rock-d",       "いわ D",           "rock",  20, 48,  "🪨"),
            ((117, 220, 74, 75),   "rock-e",       "いわ E",           "rock",  20, 48,  "🪨"),
            ((225, 243, 65, 49),   "rock-f",       "いし F",           "rock",  18, 36,  "🪨"),
            ((25, 35, 50, 47),     "pebbles",      "小石",             "rock",  0,  26,  "🪨"),
            ((33, 138, 38, 34),    "pebble",       "小さい いし",      "rock",  0,  22,  "🪨"),
            ((327, 25, 183, 167),  "rock-big",     "大きい いわ",      "rock",  40, 100, "🪨"),
            ((542, 10, 211, 190),  "rock-big2",    "大きい いわ2",     "rock",  44, 110, "🪨"),
            ((780, 7, 229, 196),   "rock-big3",    "大きい いわ3",     "rock",  46, 114, "🪨"),
            ((325, 263, 220, 142), "rock-flat",    "ひらたい いわ",    "rock",  42, 92,  "🪨"),
            # ---- どうぐ ----
            ((740, 542, 119, 111), "chest",        "たからばこ",       "thing", 20, 54,  "🎁"),
            ((883, 537, 124, 128), "chest-open",   "あいた たからばこ", "thing", 20, 58, "🎁"),
            ((755, 719, 90, 119),  "barrel",       "たる",             "thing", 18, 56,  "🛢️"),
            ((885, 737, 117, 101), "barrel-side",  "よこの たる",      "thing", 20, 48,  "🛢️"),
            ((529, 903, 87, 93),   "pot",          "つぼ",             "thing", 16, 46,  "🏺"),
            ((645, 919, 85, 85),   "pot-broken",   "われた つぼ",      "thing", 16, 40,  "🏺"),
            ((767, 893, 76, 103),  "crate",        "木ばこ",           "thing", 18, 50,  "📦"),
            ((878, 872, 131, 147), "crates",       "木ばこ たくさん",  "thing", 26, 74,  "📦"),
        ],
    },
    {
        "file": "asset_houses_structures_1785938115855.jpg",
        "thr": 232,
        "parts": [
            ((13, 17, 229, 233),   "house",        "いえ",             "build", 55, 150, "🏠"),
            ((268, 12, 228, 234),  "house2",       "いえ2",            "build", 55, 150, "🏠"),
            ((11, 260, 222, 215),  "house-big",    "大きい いえ",      "build", 55, 146, "🏠"),
            ((537, 30, 209, 201),  "house-stone",  "いしの いえ",      "build", 52, 140, "🏠"),
            ((537, 274, 209, 208), "house-stone2", "いしの いえ2",     "build", 52, 142, "🏠"),
            ((805, 14, 190, 229),  "house-straw",  "わらの いえ",      "build", 50, 150, "🛖"),
            ((805, 263, 192, 226), "house-straw2", "わらの いえ2",     "build", 50, 148, "🛖"),
            ((281, 283, 208, 188), "barn",         "くら",             "build", 52, 132, "🏚️"),
            ((871, 558, 114, 128), "well",         "いど",             "build", 26, 74,  "⛲"),
            ((37, 542, 86, 128),   "sign",         "たてふだ",         "build", 12, 60,  "🪧"),
            ((147, 545, 88, 129),  "sign-arrow",   "やじるしの ふだ",  "build", 12, 60,  "🪧"),
            ((295, 542, 194, 64),  "fence-long",   "ながい さく",      "build", 22, 40,  "🚧"),
            ((533, 542, 97, 64),   "fence",        "さく",             "build", 16, 40,  "🚧"),
            ((725, 542, 90, 81),   "fence-corner", "さくの かど",      "build", 16, 46,  "🚧"),
            ((295, 632, 194, 95),  "fence-tall",   "たかい さく",      "build", 22, 58,  "🚧"),
            ((533, 632, 212, 95),  "gate",         "もん",             "build", 24, 58,  "🚪"),
            ((789, 637, 31, 90),   "post",         "くい",             "build", 10, 52,  "🪵"),
            ((56, 862, 108, 120),  "bridge-left",  "はしの ひだり",    "build", 28, 66,  "🌉"),
            ((182, 862, 207, 122), "bridge",       "はし",             "build", 30, 68,  "🌉"),
            ((857, 862, 111, 120), "bridge-right", "はしの みぎ",      "build", 28, 66,  "🌉"),
            ((668, 829, 162, 154), "deck",         "てすりの だい",    "build", 34, 82,  "🌉"),
        ],
    },
    {
        "file": "asset_distant_castle_cliff_pack_1785939878065.jpg",
        "thr": 232,
        "parts": [
            # せなかを けずらない 絵（そらや くもが 白いので そのまま つかう）
            ((30, 32, 328, 311),   "castle-far",   "とおくの しろ",    "land",  70, 220, "🏰", "opaque"),
            ((383, 32, 611, 311),  "scenery-lake", "とおくの みずうみ", "land", 0,  200, "🏞️", "opaque"),
            ((594, 407, 284, 187), "mountain",     "やま",             "land",  60, 130, "⛰️", "main"),
            ((883, 384, 111, 254), "cliff-wall",   "がけの かべ",      "land",  40, 150, "🧱"),
            ((30, 517, 147, 251),  "cliff",        "がけ",             "land",  45, 146, "🧱"),
            ((194, 516, 143, 253), "cliff2",       "がけ2",            "land",  45, 148, "🧱"),
        ],
    },
]

GROUP_LABEL = {
    "tree": "き・もり",
    "plant": "くさ・しげみ",
    "rock": "いし・いわ",
    "thing": "どうぐ",
    "build": "たてもの・さく",
    "land": "けしき",
}


# =========================================================
#  せなか（白い ところ）を すきとおらせる
# =========================================================
def background_mask(rgb, thr):
    """まわりと つながっている 明るい ところ ＝ せなか。
    花の 白い ところ など、中に とじこめられた 明るさは のこす。"""
    a = rgb.astype(np.int16)
    mn, mx = a.min(axis=2), a.max(axis=2)
    light = (mn >= thr) & ((mx - mn) <= 16)
    # そとがわに 明るい わくを たしてから すきまを つなぐ
    # （ますめの 線や 絵の ふちの わくを またぐ ため）
    pad = np.pad(light, 14, constant_values=True)
    closed = ndimage.binary_closing(pad, np.ones((9, 9)), border_value=1)
    lbl, _ = ndimage.label(closed, structure=np.ones((3, 3)))
    return (lbl[14:-14, 14:-14] == lbl[0, 0]) & light


def to_rgba(rgb, bg):
    """せなかを けした RGBA。ふちは 少しずつ うすくして 白い ふちどりを けす。"""
    h, w, _ = rgb.shape
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    near = ndimage.binary_dilation(bg, np.ones((3, 3))) & ~bg
    mn = rgb.astype(np.int16).min(axis=2)
    soft = np.clip((248 - mn) * 255 // 36, 0, 255).astype(np.uint8)
    alpha = np.where(near, np.minimum(alpha, soft), alpha)
    out = np.dstack([rgb, alpha])
    return out


def keep_main(rgba):
    """いちばん 大きい かたまり だけ のこす。
    となりの 見本タイルが 四かくの まま 入って しまう ときに つかう。"""
    a = rgba[:, :, 3] > 8
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    if n <= 1:
        return rgba
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    rgba[:, :, 3] = np.where(lab == main, rgba[:, :, 3], 0)
    return rgba


def drop_lines(rgba):
    """シートの ますめの 線が すこし 入って しまった ときに けす。
    ほそい 線（はば3つぶ以下）や、すかすかの かけら だけを ねらう。
    つぼの かけら の ような ちゃんとした かたまりは のこる。"""
    a = rgba[:, :, 3] > 8
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    if n <= 1:
        return rgba
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        part = lab[sl] == i
        area = int(part.sum())
        bh, bw = part.shape
        thin = min(bw, bh) <= 3
        sparse = area <= 0.12 * bw * bh and area < 600
        if thin or sparse:
            sub = rgba[sl]
            sub[:, :, 3] = np.where(part, 0, sub[:, :, 3])
    return rgba


def trim(rgba, min_px=3):
    """すきとおった ふちを けずる。
    ふちに のこった かみのけの ような 線（ますめの 線の きれはし）も
    いっしょに おとす ため、つぶが min_px こ より 少ない ふちは すてる。"""
    op = rgba[:, :, 3] > 8
    cols = np.nonzero(op.sum(axis=0) >= min_px)[0]
    rows = np.nonzero(op.sum(axis=1) >= min_px)[0]
    if not len(cols) or not len(rows):
        return rgba
    return rgba[rows.min(): rows.max() + 1, cols.min(): cols.max() + 1]


# =========================================================
#  下しらべ（--scan）
# =========================================================
def scan(path, thr):
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im)
    fg = ndimage.binary_opening(~background_mask(rgb, thr), np.ones((2, 2)))
    glued = ndimage.binary_dilation(fg, np.ones((5, 5)))
    lab, _ = ndimage.label(glued, structure=np.ones((3, 3)))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        part = fg[sl] & (lab[sl] == i)
        if part.sum() < 250:
            continue
        ys, xs = np.nonzero(part)
        boxes.append((int(sl[1].start + xs.min()), int(sl[0].start + ys.min()),
                      int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    boxes.sort(key=lambda b: (round(b[1] / 60), b[0]))
    prev = im.copy()
    d = ImageDraw.Draw(prev)
    for i, (x, y, w, h) in enumerate(boxes):
        d.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 0, 0), width=2)
        d.text((x + 3, y + 2), str(i), fill=(255, 0, 0))
        print("  %2d  (%d, %d, %d, %d)" % (i, x, y, w, h))
    out = os.path.join(TOOLS, "scan_" + os.path.basename(path).rsplit(".", 1)[0] + ".png")
    prev.save(out)
    print("  → 下しらべ画ぞう:", out)


# =========================================================
#  ほんばん
# =========================================================
def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    entries = []
    for sheet in SHEETS:
        path = os.path.join(TOOLS, sheet["file"])
        if not os.path.exists(path):
            print("!! みつからない:", path)
            continue
        im = Image.open(path).convert("RGB")
        rgb = np.asarray(im)
        bg = background_mask(rgb, sheet["thr"])
        rgba_all = to_rgba(rgb, bg)
        print(os.path.basename(path), "→", len(sheet["parts"]), "こ")
        for p in sheet["parts"]:
            (x, y, w, h), pid, label, group, r, size, em = p[:7]
            opt = p[7] if len(p) > 7 else ""
            crop = rgba_all[y:y + h, x:x + w].copy()
            if opt == "opaque":
                crop[:, :, 3] = 255      # そのままの 四かくの 絵（そらが 白い ものなど）
            else:
                if opt == "main":
                    crop = keep_main(crop)  # となりの 見本タイルを おとす
                crop = trim(drop_lines(crop))
            out_path = os.path.join(OUT_DIR, pid + ".png")
            # castle-far は高精度透過処理済みPNGを保護
            if not (pid == "castle-far" and os.path.exists(out_path)):
                img = Image.fromarray(crop, "RGBA")
                img.save(out_path)
            else:
                img = Image.open(out_path)
            entries.append({
                "id": pid, "label": label, "group": group,
                "w": img.width, "h": img.height,
                "r": r, "size": size, "em": em,
            })
    # 手動生成された追加パーツ（滝・空・雲）
    EXTRA_PARTS = [
        {"id": "waterfall", "label": "たき", "group": "land", "w": 174, "h": 180, "r": 42, "size": 130, "em": "🌊"},
        {"id": "sky-clouds", "label": "そらと くも", "group": "land", "w": 328, "h": 200, "r": 0, "size": 200, "em": "☁️"},
        {"id": "sky", "label": "そら", "group": "land", "w": 328, "h": 200, "r": 0, "size": 200, "em": "🌌"},
        {"id": "cloud-big", "label": "おおきな くも", "group": "land", "w": 231, "h": 98, "r": 0, "size": 100, "em": "☁️"},
        {"id": "cloud-wind", "label": "ながれる くも", "group": "land", "w": 206, "h": 99, "r": 0, "size": 100, "em": "☁️"},
        {"id": "cloud-small", "label": "ちいさな くも", "group": "land", "w": 62, "h": 52, "r": 0, "size": 50, "em": "☁️"},
    ]
    for ep in EXTRA_PARTS:
        if not any(e["id"] == ep["id"] for e in entries):
            entries.append(ep)
    order = list(GROUP_LABEL.keys())
    entries.sort(key=lambda e: (order.index(e["group"]), 0))
    write_js(entries)
    print("できた:", len(entries), "こ →", OUT_DIR)


def write_js(entries):
    lines = [
        "/*",
        " * =========================================================",
        " *  マップの パーツ一らん（じどうで つくられる ファイル）",
        " * =========================================================",
        " *  手で なおさないでね。かえたい ときは",
        " *      python tools/build-assets.py",
        " *  を もう一ど 走らせる。",
        " *",
        " *    id    絵の 名まえ（マップデータに のこる）",
        " *    r     ぶつかる まるの 大きさ（0 = すりぬける かざり）",
        " *    size  ゲームの中での たての 大きさ",
        " *    em    絵が よみこめない ときの 代わりの 絵文字",
        " * =========================================================",
        " */",
        "(function () {",
        '  "use strict";',
        "  window.PartAssets = {",
        '    dir: "assets/parts/",',
        "    groups: " + json.dumps(GROUP_LABEL, ensure_ascii=False) + ",",
        "    list: [",
    ]
    for e in entries:
        lines.append(
            '      { id: "%s", label: "%s", group: "%s", w: %d, h: %d, r: %d, size: %d, em: "%s" },'
            % (e["id"], e["label"], e["group"], e["w"], e["h"], e["r"], e["size"], e["em"])
        )
    lines += ["    ],", "  };", "})();", ""]
    with open(OUT_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    if "--scan" in sys.argv:
        for sheet in SHEETS:
            path = os.path.join(TOOLS, sheet["file"])
            if os.path.exists(path):
                print("==", sheet["file"])
                scan(path, sheet["thr"])
    else:
        build()
