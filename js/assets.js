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

  // ---- じめんの テクスチャ（シームレス・パターン）----
  //   単色ベタ塗りを防ぎ、草・土・石畳・森の地面に温かみのある手描き風のテクスチャを付与する。
  const patternCanvasCache = {};
  const patternCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function makeRng(seed) {
    let s = (seed || 123456) >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRectOnCtx(c, x, y, w, h, r) {
    if (r <= 0) { c.rect(x, y, w, h); return; }
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function createPatternCanvas(key) {
    if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
    const size = 128;
    const cvs = document.createElement("canvas");
    cvs.width = size;
    cvs.height = size;
    const c = cvs.getContext("2d");
    if (!c) return null;

    // タイルの端をまたぐ描画（上下左右のラップアラウンド）
    function wrapDraw(fn) {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          c.save();
          c.translate(ox, oy);
          fn();
          c.restore();
        }
      }
    }

    if (key === "grass") {
      // 1) 通常の草地（#8fca7a）
      c.fillStyle = "#8fca7a";
      c.fillRect(0, 0, size, size);

      const rng = makeRng(4242);
      // 柔らかな木漏れ日と起伏の濃淡
      wrapDraw(() => {
        for (let i = 0; i < 220; i++) {
          const x = rng() * size, y = rng() * size, r = 6 + rng() * 12;
          c.fillStyle = rng() < 0.5 ? "rgba(160, 222, 138, 0.22)" : "rgba(120, 182, 98, 0.18)";
          c.beginPath();
          c.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
          c.fill();
        }
      });

      // 自然な草の葉（ポアソン間隔で散布）
      const tufts = [];
      let attempts = 0;
      while (tufts.length < 28 && attempts < 800) {
        attempts++;
        const tx = 6 + rng() * (size - 12);
        const ty = 6 + rng() * (size - 12);
        let tooClose = false;
        for (const [ox, oy] of tufts) {
          const dx = Math.min(Math.abs(tx - ox), size - Math.abs(tx - ox));
          const dy = Math.min(Math.abs(ty - oy), size - Math.abs(ty - oy));
          if (Math.hypot(dx, dy) < 16) { tooClose = true; break; }
        }
        if (!tooClose) {
          const kinds = ["triple", "double", "single", "single", "tuft4"];
          tufts.push([tx, ty, kinds[Math.floor(rng() * kinds.length)]]);
        }
      }

      wrapDraw(() => {
        for (const [x, y, kind] of tufts) {
          // 根元の影
          c.fillStyle = "rgba(0, 0, 0, 0.12)";
          c.beginPath();
          c.ellipse(x, y, 2.5, 1.2, 0, 0, Math.PI * 2);
          c.fill();

          const bladeDark = "#538d42";
          const bladeLight = "#b5f59c";
          c.lineWidth = 1;
          c.lineCap = "round";

          if (kind === "triple") {
            // 左
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x - 1, y + 1); c.lineTo(x - 3, y - 3); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x - 3.5, y - 4.5, 1.5, 1.5);
            // 中央
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x, y + 1); c.lineTo(x, y - 5); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x - 0.5, y - 6.5, 1.5, 1.5);
            // 右
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + 3, y - 3); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x + 2.5, y - 4.5, 1.5, 1.5);
          } else if (kind === "double") {
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x - 1, y + 1); c.lineTo(x - 2, y - 4); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x - 2.5, y - 5.5, 1.5, 1.5);
            c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + 2, y - 4); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x + 1.5, y - 5.5, 1.5, 1.5);
          } else if (kind === "tuft4") {
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x - 2, y + 1); c.lineTo(x - 4, y - 3); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x - 4.5, y - 4.5, 1.5, 1.5);
            c.beginPath(); c.moveTo(x - 1, y + 1); c.lineTo(x - 1, y - 5); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x - 1.5, y - 6.5, 1.5, 1.5);
            c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + 1, y - 5); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x + 0.5, y - 6.5, 1.5, 1.5);
            c.beginPath(); c.moveTo(x + 2, y + 1); c.lineTo(x + 4, y - 3); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x + 2.5, y - 4.5, 1.5, 1.5);
          } else {
            const tilt = rng() < 0.33 ? -1 : (rng() < 0.66 ? 0 : 1);
            c.strokeStyle = bladeDark;
            c.beginPath(); c.moveTo(x, y + 1); c.lineTo(x + tilt, y - 4); c.stroke();
            c.fillStyle = bladeLight; c.fillRect(x + tilt - 0.5, y - 5.5, 1.5, 1.5);
          }
        }
      });

      // 控えめな野の花
      const flowers = [
        { x: 26, y: 38, p: "#ffffff", c: "#f5cc3f" },
        { x: 96, y: 44, p: "#fffde0", c: "#f5cc3f" },
        { x: 48, y: 102, p: "#c2e2ff", c: "#4a94e8" },
        { x: 116, y: 112, p: "#ffffff", c: "#f5cc3f" },
      ];
      wrapDraw(() => {
        for (const fl of flowers) {
          c.fillStyle = fl.p;
          c.fillRect(fl.x - 1.5, fl.y - 0.5, 3, 1);
          c.fillRect(fl.x - 0.5, fl.y - 1.5, 1, 3);
          c.fillStyle = fl.c;
          c.fillRect(fl.x - 0.5, fl.y - 0.5, 1, 1);
        }
      });

      // クローバー
      const clovers = [{ x: 44, y: 20 }, { x: 82, y: 82 }];
      wrapDraw(() => {
        c.fillStyle = "#4f8a3d";
        for (const cl of clovers) {
          c.fillRect(cl.x - 1.5, cl.y - 1.5, 1, 1);
          c.fillRect(cl.x + 0.5, cl.y - 1.5, 1, 1);
          c.fillRect(cl.x - 0.5, cl.y - 0.5, 1, 1);
          c.fillStyle = "#37632a";
          c.fillRect(cl.x - 0.5, cl.y + 0.5, 1, 1);
        }
      });
    } else if (key === "grass2") {
      // 2) 深い草地（#79b768）
      c.fillStyle = "#79b768";
      c.fillRect(0, 0, size, size);

      const rng = makeRng(777);
      wrapDraw(() => {
        for (let i = 0; i < 220; i++) {
          const x = rng() * size, y = rng() * size, r = 6 + rng() * 12;
          c.fillStyle = rng() < 0.5 ? "rgba(140, 202, 120, 0.20)" : "rgba(95, 155, 78, 0.22)";
          c.beginPath();
          c.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
          c.fill();
        }
      });

      // 濃い草葉と苔
      wrapDraw(() => {
        for (let i = 0; i < 24; i++) {
          const x = rng() * size, y = rng() * size;
          c.fillStyle = "rgba(0,0,0,0.14)";
          c.beginPath(); c.ellipse(x, y, 2.5, 1.2, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "#447734";
          c.lineWidth = 1;
          c.beginPath(); c.moveTo(x, y + 1); c.lineTo(x + (rng() < 0.5 ? -1 : 1), y - 4); c.stroke();
          c.fillStyle = "#9fe486";
          c.fillRect(x - 0.5, y - 5, 1.5, 1.5);
        }
        // 落ち葉
        const leaves = [
          { x: 35, y: 40, col: "#886134" },
          { x: 90, y: 75, col: "#9b703c" },
          { x: 60, y: 110, col: "#75502c" },
        ];
        for (const l of leaves) {
          c.fillStyle = l.col;
          c.beginPath(); c.ellipse(l.x, l.y, 2, 1.2, rng() * Math.PI, 0, Math.PI * 2); c.fill();
        }
      });
    } else if (key === "dirt") {
      // 3) 土の道（#c9a878）
      c.fillStyle = "#c9a878";
      c.fillRect(0, 0, size, size);

      const rng = makeRng(2024);
      wrapDraw(() => {
        for (let i = 0; i < 280; i++) {
          const x = rng() * size, y = rng() * size, r = 4 + rng() * 8;
          c.fillStyle = rng() < 0.5 ? "rgba(225, 196, 150, 0.22)" : "rgba(178, 142, 94, 0.18)";
          c.beginPath();
          c.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
          c.fill();
        }
      });

      // 自然な小石
      const pebbles = [
        { x: 22, y: 28, r: 2, c: "#968777", h: "#eee6d9" },
        { x: 75, y: 45, r: 2.5, c: "#8c7d6e", h: "#e2dad0" },
        { x: 42, y: 85, r: 2, c: "#998a7a", h: "#eee6d9" },
        { x: 108, y: 92, r: 2, c: "#918273", h: "#e6ded3" },
        { x: 90, y: 20, r: 1.5, c: "#8a7b6c", h: "#dcd4c8" },
        { x: 55, y: 60, r: 2, c: "#968777", h: "#eee6d9" },
        { x: 15, y: 110, r: 1.5, c: "#8a7b6c", h: "#dcd4c8" },
      ];
      wrapDraw(() => {
        for (const p of pebbles) {
          // 接地影
          c.fillStyle = "rgba(0, 0, 0, 0.20)";
          c.beginPath(); c.ellipse(p.x, p.y + p.r * 0.7, p.r + 0.8, p.r * 0.5, 0, 0, Math.PI * 2); c.fill();
          // 石の本体
          c.fillStyle = p.c;
          c.beginPath(); c.ellipse(p.x, p.y, p.r, p.r * 0.85, 0, 0, Math.PI * 2); c.fill();
          // ハイライト
          c.fillStyle = p.h;
          c.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.6, 1, 1);
        }
      });
    } else if (key === "stone" || key === "stone2") {
      // 4) 石畳・石の床
      const isDark = (key === "stone2");
      c.fillStyle = isDark ? "#8d8a96" : "#b9b7bf";
      c.fillRect(0, 0, size, size);

      const rows = 8, cols = 4;
      const rh = size / rows, cw = size / cols;
      const tones = isDark
        ? ["#84818d", "#8c8995", "#7e7b87", "#93909c"]
        : ["#b5b3bb", "#bdbbb5", "#c1bfc7", "#cac8d0"];

      wrapDraw(() => {
        for (let r = 0; r < rows; r++) {
          const y0 = r * rh;
          const offset = (r % 2 === 1) ? (cw * 0.5) : 0;
          for (let col = -1; col <= cols; col++) {
            const x0 = col * cw + offset;
            const m = 1.8;
            const sx0 = x0 + m, sy0 = y0 + m;
            const sw = cw - m * 2, sh = rh - m * 2;
            const tone = tones[(r * 3 + (col + 10)) % 4];

            // 石ブロック本体
            c.fillStyle = tone;
            roundRectOnCtx(c, sx0, sy0, sw, sh, 2);
            c.fill();

            // 上・左のハイライト
            c.strokeStyle = "rgba(255, 255, 255, 0.28)";
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(sx0 + 1, sy0 + sh - 2);
            c.lineTo(sx0 + 1, sy0 + 1);
            c.lineTo(sx0 + sw - 2, sy0 + 1);
            c.stroke();

            // 下・右の目地影
            c.strokeStyle = "rgba(0, 0, 0, 0.28)";
            c.beginPath();
            c.moveTo(sx0 + 1, sy0 + sh - 1);
            c.lineTo(sx0 + sw - 1, sy0 + sh - 1);
            c.lineTo(sx0 + sw - 1, sy0 + 1);
            c.stroke();
          }
        }
      });
    } else if (key === "wood") {
      // 5) 木の床
      c.fillStyle = "#c08a52";
      c.fillRect(0, 0, size, size);
      const rows = 8, rh = size / rows;
      wrapDraw(() => {
        for (let r = 0; r < rows; r++) {
          const y0 = r * rh;
          c.fillStyle = r % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
          c.fillRect(0, y0, size, rh - 1);
          c.fillStyle = "rgba(0,0,0,0.25)";
          c.fillRect(0, y0 + rh - 1, size, 1);
          // 木目筋
          c.fillStyle = "rgba(0,0,0,0.08)";
          c.fillRect(10, y0 + 4, 35, 1);
          c.fillRect(70, y0 + 9, 45, 1);
          // 釘
          c.fillStyle = "rgba(0,0,0,0.3)";
          c.fillRect(8, y0 + rh * 0.5 - 0.5, 1.5, 1.5);
          c.fillRect(size - 10, y0 + rh * 0.5 - 0.5, 1.5, 1.5);
        }
      });
    } else if (key === "sand") {
      // 6) 砂地
      c.fillStyle = "#e7d7a4";
      c.fillRect(0, 0, size, size);
      const rng = makeRng(111);
      wrapDraw(() => {
        for (let i = 0; i < 220; i++) {
          const x = rng() * size, y = rng() * size;
          c.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.25)" : "rgba(180,150,90,0.18)";
          c.fillRect(x, y, 1.5, 1.5);
        }
        // 砂紋
        c.strokeStyle = "rgba(200, 170, 110, 0.18)";
        c.lineWidth = 1.5;
        for (let y = 16; y < size; y += 32) {
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(size * 0.33, y - 4, size * 0.66, y + 4, size, y);
          c.stroke();
        }
      });
    } else if (key === "water") {
      // 7) 水面・川（澄んだ青＋さざなみ）
      c.fillStyle = "#4ea8de";
      c.fillRect(0, 0, size, size);
      const rng = makeRng(777);
      wrapDraw(() => {
        // 水面の濃淡
        for (let i = 0; i < 60; i++) {
          const x = rng() * size, y = rng() * size, r = 10 + rng() * 18;
          c.fillStyle = rng() < 0.5 ? "rgba(255, 255, 255, 0.18)" : "rgba(30, 100, 180, 0.15)";
          c.beginPath();
          c.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, Math.PI * 2);
          c.fill();
        }
        // さざなみ波紋
        c.strokeStyle = "rgba(255, 255, 255, 0.35)";
        c.lineWidth = 1.5;
        for (let y = 12; y < size; y += 24) {
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(size * 0.25, y - 3, size * 0.5, y + 3, size * 0.75, y - 2);
          c.bezierCurveTo(size * 0.88, y - 1, size * 0.95, y + 2, size, y);
          c.stroke();
        }
      });
    } else {
      // 8) 任意の背景色（森の土台 #4e7a44 など）
      const baseCol = (typeof key === "string" && key.startsWith("#")) ? key : "#4e7a44";
      c.fillStyle = baseCol;
      c.fillRect(0, 0, size, size);

      const rng = makeRng(999);
      // 暗い森の床・腐葉土
      wrapDraw(() => {
        for (let i = 0; i < 200; i++) {
          const x = rng() * size, y = rng() * size, r = 5 + rng() * 10;
          c.fillStyle = rng() < 0.5 ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)";
          c.beginPath();
          c.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
          c.fill();
        }
        // 落ち葉・松葉
        const leaves = [
          { x: 22, y: 28, c: "#7a542e" },
          { x: 65, y: 34, c: "#8a6336" },
          { x: 105, y: 22, c: "#3e5c33" },
          { x: 38, y: 75, c: "#6e4b28" },
          { x: 88, y: 80, c: "#916938" },
          { x: 52, y: 112, c: "#3b5830" },
          { x: 115, y: 105, c: "#7a542e" },
        ];
        for (const l of leaves) {
          c.fillStyle = l.c;
          c.beginPath(); c.ellipse(l.x, l.y, 2, 1.2, 0.8, 0, Math.PI * 2); c.fill();
        }
      });
    }

    return cvs;
  }

  function getGroundPattern(ctx, kindOrColor, fallbackColor) {
    const fallback = fallbackColor || (typeof kindOrColor === "string" && kindOrColor.startsWith("#") ? kindOrColor : "#8fca7a");
    if (!ctx || typeof ctx.createPattern !== "function" || typeof document === "undefined" || typeof document.createElement !== "function") {
      return fallback;
    }

    const key = kindOrColor || "grass";
    let pattern = null;
    let ctxMap = patternCache ? patternCache.get(ctx) : null;
    if (patternCache && !ctxMap) {
      ctxMap = {};
      patternCache.set(ctx, ctxMap);
    }
    if (ctxMap && ctxMap[key]) return ctxMap[key];

    let cvs = patternCanvasCache[key];
    if (!cvs) {
      cvs = patternCanvasCache[key] = createPatternCanvas(key);
    }
    if (cvs) {
      try {
        pattern = ctx.createPattern(cvs, "repeat");
      } catch (e) {
        pattern = null;
      }
    }
    if (pattern) {
      if (ctxMap) ctxMap[key] = pattern;
      return pattern;
    }
    return fallback;
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
    getGroundPattern,
  };
})();
