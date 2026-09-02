# -*- coding: utf-8 -*-
"""
Character/ 内の生成スプライト画像を透過PNGにし、
128x128 下揃え規格（足の裏が下端から4%）の walking スプライトとして
assets/<char_name>/ に配置するスクリプト。
"""
import os
import sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAR_DIR = os.path.join(ROOT, "Character")
ASSETS_DIR = os.path.join(ROOT, "assets")

def clean_and_transparent(img_rgb, is_belle=False):
    """
    外周からのFlood Fill + 孤立緑の除去により背景を除去。
    足元の影や髪の間の隙間の緑も綺麗に透過する。
    """
    arr = np.array(img_rgb, dtype=np.int32)
    h, w, _ = arr.shape
    
    # 背景の代表色（四隅）
    corners = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    bg_colors = [arr[y, x, :3] for x, y in corners]
    bg_mean = np.mean(bg_colors, axis=0)
    
    bg_mask = np.zeros((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    
    # 外周すべてをシードにする
    q = deque()
    for x in range(w):
        for y in [0, 1, h - 2, h - 1]:
            q.append((x, y))
            visited[y, x] = True
    for y in range(h):
        for x in [0, 1, w - 2, w - 1]:
            if not visited[y, x]:
                q.append((x, y))
                visited[y, x] = True
                
    while q:
        cx, cy = q.popleft()
        p = arr[cy, cx, :3]
        
        dist = np.linalg.norm(p - bg_mean)
        is_bg_color = dist < 45
        # 影の緑
        is_shadow_green = (p[1] > p[0] * 1.08 and p[1] > p[2] * 1.12 and p[1] < 180 and np.max(p) > 40)
        is_outline = np.max(p) < 55 # 濃い輪郭線
        
        if (is_bg_color or is_shadow_green) and not is_outline:
            bg_mask[cy, cx] = True
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((nx, ny))

    # 孤立した緑領域（髪の間、足の間、足元の楕円影）の除去
    for y in range(h):
        for x in range(w):
            if not bg_mask[y, x]:
                p = arr[y, x, :3]
                dist = np.linalg.norm(p - bg_mean)
                if is_belle:
                    # ベルの場合は足元のみ
                    if y > h * 0.65 and dist < 25:
                        bg_mask[y, x] = True
                else:
                    # 他のキャラ（ギル、セーラ、ミィ、敵ネコ等）は髪や服に緑がないので
                    # 背景色または足元の影なら除去
                    is_pure_bg = dist < 38
                    is_shadow = (p[1] > p[0] * 1.08 and p[1] > p[2] * 1.12 and p[1] < 170 and np.max(p) > 45)
                    if (is_pure_bg or is_shadow) and np.max(p) >= 55:
                        bg_mask[y, x] = True

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.array(img_rgb)[:, :, :3]
    rgba[:, :, 3] = np.where(bg_mask, 0, 255)
    
    return Image.fromarray(rgba, mode="RGBA")


def make_128_frame(cropped_img, target_h=108, target_foot_y=123):
    """
    透過された1つのコマを 128x128 のキャンバスに中央下揃え配置する。
    足の裏（キャラ下端）を target_foot_y (約123px) に合わせる。
    """
    bbox = cropped_img.getbbox()
    if not bbox:
        return Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    
    char = cropped_img.crop(bbox)
    cw, ch = char.size
    
    # 縮小比率
    scale = target_h / float(ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    
    # ドット絵リサイズ (NEARESTでピクセルアートの質感を保持)
    resized = char.resize((nw, nh), Image.Resampling.NEAREST)
    
    # 128x128 キャンバス
    out = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    x = (128 - nw) // 2
    y = target_foot_y - nh
    out.paste(resized, (x, y), resized)
    return out


def process_2frame_character(src_filename, out_dir_name, target_h=108):
    """
    左右2コマの画像から 4方向 (down, up, left, right) x 2コマ を生成して保存。
    """
    src_path = os.path.join(CHAR_DIR, src_filename)
    if not os.path.exists(src_path):
        print(f"Skipping {src_filename}, not found.")
        return
        
    img = Image.open(src_path).convert("RGB")
    trans = clean_and_transparent(img, is_belle=False)
    w, h = trans.size
    mid = w // 2
    
    f1_crop = trans.crop((0, 0, mid, h))
    f2_crop = trans.crop((mid, 0, w, h))
    
    down1 = make_128_frame(f1_crop, target_h=target_h)
    down2 = make_128_frame(f2_crop, target_h=target_h)
    
    # left / right (左右反転)
    left1 = down1
    left2 = down2
    right1 = down1.transpose(Image.FLIP_LEFT_RIGHT)
    right2 = down2.transpose(Image.FLIP_LEFT_RIGHT)
    
    # up (正面または背面)
    up1 = down1
    up2 = down2
    
    out_dir = os.path.join(ASSETS_DIR, out_dir_name)
    os.makedirs(out_dir, exist_ok=True)
    
    down1.save(os.path.join(out_dir, "down1.png"))
    down2.save(os.path.join(out_dir, "down2.png"))
    up1.save(os.path.join(out_dir, "up1.png"))
    up2.save(os.path.join(out_dir, "up2.png"))
    left1.save(os.path.join(out_dir, "left1.png"))
    left2.save(os.path.join(out_dir, "left2.png"))
    right1.save(os.path.join(out_dir, "right1.png"))
    right2.save(os.path.join(out_dir, "right2.png"))
    print(f"Saved {out_dir_name} sprites to {out_dir}")


def process_belle_character():
    """
    4方向スプライトシートからベルの 4方向 x 2コマ を切り出し。
    """
    src_path = os.path.join(CHAR_DIR, "belle_flying_sprites_1787908197771.jpg")
    if not os.path.exists(src_path):
        return
        
    img = Image.open(src_path).convert("RGB")
    trans = clean_and_transparent(img, is_belle=True)
    w, h = trans.size
    cell_w = w // 4
    cell_h = h // 4
    
    out_dir = os.path.join(ASSETS_DIR, "belle")
    os.makedirs(out_dir, exist_ok=True)
    
    dirs = ["down", "up", "left", "right"]
    for row_idx, d in enumerate(dirs):
        c1 = trans.crop((0 * cell_w, row_idx * cell_h, 1 * cell_w, (row_idx + 1) * cell_h))
        c2 = trans.crop((1 * cell_w, row_idx * cell_h, 2 * cell_w, (row_idx + 1) * cell_h))
        
        f1 = make_128_frame(c1, target_h=80, target_foot_y=112)
        f2 = make_128_frame(c2, target_h=80, target_foot_y=112)
        
        f1.save(os.path.join(out_dir, f"{d}1.png"))
        f2.save(os.path.join(out_dir, f"{d}2.png"))
        
    print(f"Saved belle sprites to {out_dir}")


if __name__ == "__main__":
    process_2frame_character("cat_mii.jpg", "mii", target_h=88)
    process_2frame_character("enemy_cat.jpg", "enemy", target_h=88)
    process_2frame_character("gil_walk_matching_seera_1787908931152.jpg", "gil", target_h=104)
    process_2frame_character("seera_walk_no_jacket_1787908409932.jpg", "seera", target_h=104)
    process_2frame_character("shadow_cloak_sprite_1788352434989.jpg", "kagemanto", target_h=106)
    process_2frame_character("training_dummy_kakashi_1788352453931.jpg", "kakashi", target_h=108)
    process_2frame_character("grandma_sumire.jpg", "sumire", target_h=102)
    process_2frame_character("owl_hou.jpg", "hou", target_h=85)
    process_2frame_character("dark_demon_king_1788352573206.jpg", "maou", target_h=114)
    process_belle_character()
    print("All character sprites processed successfully!")
