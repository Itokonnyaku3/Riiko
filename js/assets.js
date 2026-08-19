/*
 * =========================================================
 *  マップの パーツの 絵（assets/parts/*.png）
 * =========================================================
 *  js/assets-data.js（じどうで つくられる 一らん）の 絵を
 *  ゲームと マップ作成ツールの りょうほうで つかう ための どうぐ。
 *
 *  かんがえかた
 *    ・マップデータの sprite は「絵の 名まえ」（れい: "tree"）。
 *    ・絵が まだ よみこめて いない ときは、代わりの 絵文字で かく。
 *      （Node の テストや、絵を けして しまった ときでも あそべる）
 *    ・むかしの マップは sprite が 絵文字（"🌳"）。ALIAS で
 *      あたらしい 絵に つなぐので、そのまま きれいに 見える。
 * =========================================================
 */
(function () {
  "use strict";

  const W = typeof window !== "undefined" ? window : {};
  const DATA = W.PartAssets || { dir: "assets/parts/", groups: {}, list: [] };
  // tools/ の 中の ページからは 1つ 上に のぼる（"../"）
  const BASE = W.PART_ASSET_BASE || "";

  const byId = {};
  for (const a of DATA.list) byId[a.id] = a;

  // ---- むかしの 絵文字 → あたらしい 絵 ----
  //   ここを けせば、むかしの マップは 絵文字の ままに もどる。
  const ALIAS = {
    "🌳": "tree", "🌲": "fir", "🪨": "rocks", "🪵": "log", "🧱": "cliff-wall",
    "🚧": "fence", "🏠": "house", "🛖": "house-straw", "🏰": "castle-far",
    "⛰️": "mountain", "🛢️": "barrel", "📦": "crate", "🗿": "rock-d", "⛲": "well",
    "🌿": "grass-tuft", "☘️": "grass-small",
  };

  function def(sprite) {
    if (!sprite) return null;
    return byId[sprite] || byId[ALIAS[sprite]] || null;
  }

  // ---- 絵の よみこみ（つかう ものだけ よむ）----
  const images = {};
  function image(id) {
    if (typeof Image === "undefined") return null; // Node には 画像が ない
    let im = images[id];
    if (!im) {
      im = images[id] = new Image();
      im.src = BASE + DATA.dir + id + ".png";
    }
    return im.complete && im.naturalWidth ? im : null;
  }

  // 絵の ある ばしょ（マップ作成ツールの ボタンなどで つかう）
  function url(id) {
    return BASE + DATA.dir + id + ".png";
  }

  // ---- 絵文字で かく（絵が ない ときの 代わり）----
  function drawEmoji(ctx, ch, x, y, size) {
    ctx.fillStyle = "#000"; // かげの うすい色が のこって いても くっきり かく
    ctx.font = size + "px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, x, y);
  }

  // ---- しょうがいぶつを かく ----
  //   (x, y) … ぶつかる まるの まん中。r … その 大きさ。
  //   絵は 足もとが (x, y+r*0.55) に くるように おく（かげの ばしょ）。
  function drawPart(ctx, sprite, x, y, r) {
    const a = def(sprite);
    const im = a && image(a.id);
    if (a && im) {
      const k = a.r ? r / a.r : (r * 2) / a.size; // 大きさの ばいりつ
      const h = a.size * k;
      const w = (h * a.w) / a.h;
      ctx.drawImage(im, x - w / 2, y + r * 0.55 - h, w, h);
      return true;
    }
    drawEmoji(ctx, a ? a.em : sprite, x, y, r * 1.7);
    return false;
  }

  // ---- かざり（ぶつからない）を かく。size は たての 大きさ ----
  function drawDeco(ctx, sprite, x, y, size) {
    const a = def(sprite);
    const im = a && image(a.id);
    if (a && im) {
      const h = size;
      const w = (h * a.w) / a.h;
      ctx.drawImage(im, x - w / 2, y - h * 0.6, w, h);
      return true;
    }
    drawEmoji(ctx, a ? a.em : sprite, x, y, size);
    return false;
  }

  // その パーツの ふつうの 大きさ（ぶつかる まる）
  function radius(sprite, fallback) {
    const a = def(sprite);
    return a && a.r ? a.r : fallback || 20;
  }

  // ボタンなどに 出す 名まえ
  function label(sprite) {
    const a = def(sprite);
    return a ? a.label : sprite;
  }

  W.Assets = {
    dir: DATA.dir,
    list: DATA.list,
    groups: DATA.groups,
    def,
    url,
    image,
    radius,
    label,
    drawPart,
    drawDeco,
    drawEmoji,
  };
})();
