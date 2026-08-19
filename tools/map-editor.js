/*
 * =========================================================
 *  マップ作成ツール
 * =========================================================
 *  つかいかた：tools/map-editor.html を ブラウザで ひらくだけ。
 *
 *  かんがえかた
 *    1) 「あるける じめん」を おく（しかく・まる・ふで）
 *    2) その まわりは 木や かべで じどうで うまる（森・しろ の かべ）
 *    3) じめんの 上に パーツ（いわ・たる・とう…）を ならべる
 *    4) 「ファイルに だす」→ js/maps/◯◯.js に ほぞん
 * =========================================================
 */
(function () {
  "use strict";

  const M = window.MapData;
  const A = window.Assets;
  const $ = (id) => document.getElementById(id);
  const canvas = $("map");
  const ctx = canvas.getContext("2d");
  const SAVE_KEY = "riiko.mapeditor.v1";

  // ---- どうぐ ----
  const TOOLS = [
    { id: "pan", ic: "🖐", label: "うごかす" },
    { id: "ground-rect", ic: "⬛", label: "じめん□" },
    { id: "ground-circle", ic: "⭕", label: "じめん◯" },
    { id: "ground-brush", ic: "🖌", label: "じめん ふで" },
    { id: "ground-erase", ic: "✂️", label: "じめんを けす" },
    { id: "part", ic: "🌳", label: "パーツを おく" },
    { id: "part-line", ic: "〰️", label: "パーツを ならべる" },
    { id: "part-fill", ic: "▦", label: "パーツで うめる" },
    { id: "deco", ic: "🌸", label: "かざり" },
    { id: "marker", ic: "📍", label: "めじるし" },
    { id: "erase", ic: "🧽", label: "けす" },
    { id: "walk", ic: "▶", label: "ためしに あるく" },
  ];

  // ---- じょうたい ----
  const S = {
    data: null,
    tool: "ground-rect",
    kind: "grass",
    part: { sprite: "tree", r: 26 },
    deco: "grass-tuft",
    marker: "enemy",
    brushR: 70,
    partR: 26,
    space: 46,
    jitter: 6,
    fillCache: [],
    excludeSet: new Set(),
    cam: { x: 0, y: 0 },
    zoom: 0.5,
    mouse: { x: 0, y: 0, on: false },
    drag: null,
    undo: [],
    redo: [],
    grid: true,
    hit: false,
    snap: 0,
    walk: null,
    last: 0,
    fitted: false,
  };

  // =========================================================
  //  データ
  // =========================================================
  function newData() {
    return {
      name: "stage2",
      title: "あたらしい マップ",
      world: { width: 1400, height: 2200, ground: "#5d8a4e" },
      areas: [],
      fill: { on: true, sprite: "tree", r: 26, gap: 58, jitter: 14, margin: 24, exclude: [] },
      objects: [],
      decorations: [],
      markers: [],
    };
  }

  function setData(d) {
    S.data = d;
    S.excludeSet = new Set(d.fill.exclude || []);
    S.undo.length = 0;
    S.redo.length = 0;
    rebuildFill();
    syncForm();
    fitView();
    save();
  }

  function snapshot() {
    S.undo.push(JSON.stringify(S.data));
    if (S.undo.length > 40) S.undo.shift();
    S.redo.length = 0;
  }

  function undo() {
    if (!S.undo.length) return;
    S.redo.push(JSON.stringify(S.data));
    applyState(S.undo.pop());
  }
  function redo() {
    if (!S.redo.length) return;
    S.undo.push(JSON.stringify(S.data));
    applyState(S.redo.pop());
  }
  function applyState(json) {
    S.data = JSON.parse(json);
    S.excludeSet = new Set(S.data.fill.exclude || []);
    rebuildFill();
    syncForm();
    save();
  }

  // まわりを うめる パーツを 計算しなおす（じめんを かえた ときだけ）
  function rebuildFill() {
    S.fillCache = M.buildFill(S.data);
  }

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(S.data));
      } catch (e) {
        /* いっぱいの ときは あきらめる */
      }
    }, 400);
  }

  // =========================================================
  //  ざひょうの へんかん
  // =========================================================
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / S.zoom + S.cam.x,
      y: (clientY - r.top) / S.zoom + S.cam.y,
    };
  }
  function sn(v) {
    return S.snap ? Math.round(v / S.snap) * S.snap : Math.round(v);
  }
  function fitView() {
    const W = canvas.clientWidth || 800,
      H = canvas.clientHeight || 600;
    const w = S.data.world.width,
      h = S.data.world.height;
    S.zoom = Math.max(0.06, Math.min(W / (w + 80), H / (h + 80)));
    S.cam.x = w / 2 - W / 2 / S.zoom;
    S.cam.y = h / 2 - H / 2 / S.zoom;
  }

  // =========================================================
  //  がめん（びょうが）
  // =========================================================
  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  // がめんの 大きさが きまったら（かわったら）合わせる
  function onResize() {
    resize();
    if (!S.fitted && canvas.clientWidth > 200) {
      fitView();
      S.fitted = true;
    }
  }
  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas);

  // 絵文字で かく（めじるし・ためし歩きの 人）
  function sprite(s, x, y, size) {
    A.drawEmoji(ctx, s, x, y, size);
  }
  // パーツ（絵）を かく
  function part(s, x, y, r) {
    A.drawPart(ctx, s, x, y, r);
  }

  function render() {
    const W = canvas.clientWidth,
      H = canvas.clientHeight;
    if (!W || !H) return; // まだ 大きさが きまっていない
    // 大きさが かわったら 合わせなおす
    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) onResize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#12161a";
    ctx.fillRect(0, 0, W, H);

    const d = S.data;
    const z = S.zoom;
    const vx0 = S.cam.x,
      vy0 = S.cam.y,
      vx1 = S.cam.x + W / z,
      vy1 = S.cam.y + H / z;

    ctx.save();
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -S.cam.x * z * dpr, -S.cam.y * z * dpr);

    // そとがわ（森のゆか など）
    ctx.fillStyle = d.world.ground;
    ctx.fillRect(0, 0, d.world.width, d.world.height);

    // あるける じめん
    for (const a of d.areas) {
      ctx.fillStyle = (M.GROUND_KINDS[a.kind] || {}).color || "#8fca7a";
      if (a.shape === "circle") {
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRect(a.x, a.y, a.w, a.h, Math.min(18, a.w / 2, a.h / 2));
        ctx.fill();
      }
    }

    // ますめ
    if (S.grid && z > 0.25) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1 / z;
      const g = 100;
      ctx.beginPath();
      for (let x = Math.floor(vx0 / g) * g; x < vx1; x += g) {
        ctx.moveTo(x, Math.max(0, vy0));
        ctx.lineTo(x, Math.min(d.world.height, vy1));
      }
      for (let y = Math.floor(vy0 / g) * g; y < vy1; y += g) {
        ctx.moveTo(Math.max(0, vx0), y);
        ctx.lineTo(Math.min(d.world.width, vx1), y);
      }
      ctx.stroke();
    }

    const on = (o, m) => o.x > vx0 - m && o.x < vx1 + m && o.y > vy0 - m && o.y < vy1 + m;
    const simple = z < 0.42; // 小さいときは まる で かんたんに かく

    // まわりを うめた パーツ
    if (simple) {
      ctx.fillStyle = "#2f5d33";
      for (const o of S.fillCache) {
        if (!on(o, 60)) continue;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (const o of S.fillCache) {
        if (!on(o, 60)) continue;
        part(o.sprite, o.x, o.y, o.r);
      }
    }

    // 手でおいた パーツ（下に ある ものほど 手まえ。ゲームと おなじ ならびかた）
    d.objects.sort((a, b) => a.y - b.y);
    for (const o of d.objects) {
      if (!on(o, 90)) continue;
      if (simple) {
        ctx.fillStyle = "#6b5330";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.ellipse(o.x, o.y + o.r * 0.5, o.r, o.r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        part(o.sprite, o.x, o.y, o.r);
      }
    }

    // かざり
    if (!simple)
      for (const o of d.decorations) {
        if (on(o, 40)) A.drawDeco(ctx, o.sprite, o.x, o.y, 30);
      }

    // ぶつかる まる
    if (S.hit) {
      ctx.strokeStyle = "rgba(255,90,90,0.85)";
      ctx.lineWidth = 1.5 / z;
      ctx.beginPath();
      for (const o of S.fillCache) {
        if (!on(o, 60)) continue;
        ctx.moveTo(o.x + o.r, o.y);
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      }
      for (const o of d.objects) {
        if (!on(o, 90)) continue;
        ctx.moveTo(o.x + o.r, o.y);
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // めじるし
    for (const mk of d.markers) {
      if (!on(mk, 40)) continue;
      const def = M.MARKERS.find((t) => t.type === mk.type) || M.MARKERS[1];
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, 22, 0, Math.PI * 2);
      ctx.fill();
      sprite(def.sprite, mk.x, mk.y, 32);
    }

    // せかいの ふち
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2 / z;
    ctx.strokeRect(0, 0, d.world.width, d.world.height);

    drawPreview();
    drawWalker();
    ctx.restore();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    status();
  }

  // どうぐの プレビュー（いま かこうとしている もの）
  function drawPreview() {
    const dg = S.drag;
    const z = S.zoom;

    // カーソルの ゴースト
    if (S.mouse.on && !dg && !S.walk) {
      const mx = S.mouse.x,
        my = S.mouse.y;
      ctx.globalAlpha = 0.55;
      if (S.tool === "part" || S.tool === "part-line" || S.tool === "part-fill") {
        part(S.part.sprite, mx, my, S.partR);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1 / z;
        ctx.beginPath();
        ctx.arc(mx, my, S.partR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (S.tool === "deco") {
        A.drawDeco(ctx, S.deco, mx, my, 30);
      } else if (S.tool === "marker") {
        const def = M.MARKERS.find((t) => t.type === S.marker);
        sprite(def.sprite, mx, my, 32);
      } else if (S.tool === "ground-brush" || S.tool === "erase") {
        ctx.strokeStyle = S.tool === "erase" ? "#ff8f8f" : "#fff";
        ctx.lineWidth = 2 / z;
        ctx.beginPath();
        ctx.arc(mx, my, S.brushR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (!dg || !dg.preview) return;
    const x0 = dg.sx,
      y0 = dg.sy,
      x1 = S.mouse.x,
      y1 = S.mouse.y;

    ctx.globalAlpha = 0.6;
    if (dg.tool === "ground-rect" || dg.tool === "part-fill") {
      const r = normRect(x0, y0, x1, y1);
      ctx.fillStyle =
        dg.tool === "ground-rect"
          ? (M.GROUND_KINDS[S.kind] || {}).color || "#fff"
          : "rgba(255,255,255,0.25)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / z;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    } else if (dg.tool === "ground-circle") {
      const rr = Math.hypot(x1 - x0, y1 - y0);
      ctx.fillStyle = (M.GROUND_KINDS[S.kind] || {}).color || "#fff";
      ctx.beginPath();
      ctx.arc(x0, y0, rr, 0, Math.PI * 2);
      ctx.fill();
    } else if (dg.tool === "part-line") {
      for (const p of linePoints(x0, y0, x1, y1, S.space)) part(S.part.sprite, p.x, p.y, S.partR);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / z;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function normRect(x0, y0, x1, y1) {
    return {
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0),
      h: Math.abs(y1 - y0),
    };
  }
  function linePoints(x0, y0, x1, y1, gap) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(d / Math.max(8, gap)));
    const out = [];
    for (let i = 0; i <= n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n });
    return out;
  }

  function status() {
    const d = S.data;
    const total = S.fillCache.length + d.objects.length;
    let t =
      "🖱 " + Math.round(S.mouse.x) + ", " + Math.round(S.mouse.y) +
      "　｜　じめん " + d.areas.length +
      "　パーツ " + total + "（じどう " + S.fillCache.length + "）" +
      "　かざり " + d.decorations.length +
      "　めじるし " + d.markers.length +
      "　｜　" + Math.round(S.zoom * 100) + "%";
    if (total > 6000) t += "　⚠ パーツが 多いです（こみぐあいを 大きく すると かるくなります）";
    $("status").textContent = t;
  }

  // =========================================================
  //  マウス／ゆび
  // =========================================================
  canvas.addEventListener("pointerdown", (ev) => {
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch (e) {
      /* とれなくても だいじょうぶ */
    }
    const w = toWorld(ev.clientX, ev.clientY);
    S.mouse.x = w.x;
    S.mouse.y = w.y;
    S.mouse.on = true;

    // まん中ボタン・右ボタン・スペース は いつでも「うごかす」
    if (ev.button === 1 || ev.button === 2 || S.tool === "pan" || S.space_ || S.walk) {
      S.drag = { tool: "pan", px: ev.clientX, py: ev.clientY };
      return;
    }
    startTool(w.x, w.y);
  });

  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

  canvas.addEventListener("pointermove", (ev) => {
    const w = toWorld(ev.clientX, ev.clientY);
    S.mouse.x = w.x;
    S.mouse.y = w.y;
    S.mouse.on = true;
    const dg = S.drag;
    if (!dg) return;
    if (dg.tool === "pan") {
      S.cam.x -= (ev.clientX - dg.px) / S.zoom;
      S.cam.y -= (ev.clientY - dg.py) / S.zoom;
      dg.px = ev.clientX;
      dg.py = ev.clientY;
      return;
    }
    moveTool(w.x, w.y);
  });

  canvas.addEventListener("pointerup", (ev) => {
    const w = toWorld(ev.clientX, ev.clientY);
    if (S.drag && S.drag.tool !== "pan") endTool(w.x, w.y);
    S.drag = null;
  });
  canvas.addEventListener("pointerleave", () => (S.mouse.on = false));

  canvas.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const before = toWorld(ev.clientX, ev.clientY);
      const k = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
      S.zoom = Math.min(3, Math.max(0.06, S.zoom * k));
      const after = toWorld(ev.clientX, ev.clientY);
      S.cam.x += before.x - after.x;
      S.cam.y += before.y - after.y;
    },
    { passive: false }
  );

  // ---- どうぐ：はじめ ----
  function startTool(x, y) {
    const t = S.tool;
    if (t === "ground-rect" || t === "ground-circle" || t === "part-line" || t === "part-fill") {
      S.drag = { tool: t, sx: sn(x), sy: sn(y), preview: true };
      return;
    }
    S.drag = { tool: t, lastX: x, lastY: y };
    snapshot();
    if (t === "ground-brush") paintGround(x, y);
    else if (t === "part") placePart(x, y);
    else if (t === "deco") placeDeco(x, y);
    else if (t === "marker") placeMarker(x, y);
    else if (t === "erase") eraseAt(x, y);
    else if (t === "ground-erase") eraseGround(x, y);
    save();
  }

  // ---- どうぐ：ひっぱり中 ----
  function moveTool(x, y) {
    const dg = S.drag;
    if (!dg || dg.preview) return;
    const step = Math.hypot(x - dg.lastX, y - dg.lastY);
    if (dg.tool === "ground-brush") {
      if (step < S.brushR * 0.45) return;
      paintGround(x, y);
    } else if (dg.tool === "part") {
      if (step < S.space) return;
      placePart(x, y);
    } else if (dg.tool === "deco") {
      if (step < 26) return;
      placeDeco(x, y);
    } else if (dg.tool === "erase") {
      if (step < S.brushR * 0.4) return;
      eraseAt(x, y);
    } else return;
    dg.lastX = x;
    dg.lastY = y;
    save();
  }

  // ---- どうぐ：おわり ----
  function endTool(x, y) {
    const dg = S.drag;
    if (!dg || !dg.preview) return;
    const x0 = dg.sx,
      y0 = dg.sy,
      x1 = sn(x),
      y1 = sn(y);

    if (dg.tool === "ground-rect") {
      const r = normRect(cx(x0), cy(y0), cx(x1), cy(y1));
      if (r.w < 16 || r.h < 16) return;
      snapshot();
      S.data.areas.push({ shape: "rect", x: r.x, y: r.y, w: r.w, h: r.h, kind: S.kind });
      rebuildFill();
    } else if (dg.tool === "ground-circle") {
      const rr = Math.round(Math.hypot(x1 - x0, y1 - y0));
      if (rr < 14) return;
      snapshot();
      S.data.areas.push({ shape: "circle", x: cx(x0), y: cy(y0), r: rr, kind: S.kind });
      rebuildFill();
    } else if (dg.tool === "part-line") {
      if (Math.hypot(x1 - x0, y1 - y0) < 4) return;
      snapshot();
      for (const p of linePoints(x0, y0, x1, y1, S.space)) placePart(p.x, p.y, true);
    } else if (dg.tool === "part-fill") {
      const r = normRect(x0, y0, x1, y1);
      if (r.w < 8 || r.h < 8) return;
      snapshot();
      const gap = Math.max(12, S.space);
      for (let px = r.x; px <= r.x + r.w; px += gap)
        for (let py = r.y; py <= r.y + r.h; py += gap) placePart(px, py, true);
    }
    save();
  }

  // ---- おく／けす ----
  //   マップの そとには おけない ように しておく
  function cx(v) {
    return Math.max(0, Math.min(S.data.world.width, Math.round(v)));
  }
  function cy(v) {
    return Math.max(0, Math.min(S.data.world.height, Math.round(v)));
  }

  function paintGround(x, y) {
    S.data.areas.push({ shape: "circle", x: cx(sn(x)), y: cy(sn(y)), r: Math.round(S.brushR), kind: S.kind });
    rebuildFill();
  }

  function placePart(x, y, noSnap) {
    const j = S.jitter;
    const jx = j ? (Math.random() * 2 - 1) * j : 0;
    const jy = j ? (Math.random() * 2 - 1) * j : 0;
    const px = noSnap ? x + jx : sn(x + jx);
    const py = noSnap ? y + jy : sn(y + jy);
    S.data.objects.push({ x: cx(px), y: cy(py), r: S.partR, sprite: S.part.sprite });
  }

  function placeDeco(x, y) {
    S.data.decorations.push({ x: cx(sn(x)), y: cy(sn(y)), sprite: S.deco });
  }

  function placeMarker(x, y) {
    S.data.markers.push({ x: cx(sn(x)), y: cy(sn(y)), type: S.marker });
  }

  function eraseAt(x, y) {
    const r = S.brushR;
    const far = (o) => Math.hypot(o.x - x, o.y - y) > r;
    S.data.objects = S.data.objects.filter(far);
    S.data.decorations = S.data.decorations.filter(far);
    S.data.markers = S.data.markers.filter(far);
    // じどうで うめた パーツは「けした ばしょ」を おぼえておく
    const keep = [];
    let changed = false;
    for (const o of S.fillCache) {
      if (far(o)) {
        keep.push(o);
      } else {
        S.excludeSet.add(M.excludeKey(o.x, o.y));
        changed = true;
      }
    }
    if (changed) {
      S.fillCache = keep;
      S.data.fill.exclude = Array.from(S.excludeSet);
    }
  }

  function eraseGround(x, y) {
    for (let i = S.data.areas.length - 1; i >= 0; i--) {
      if (M.inArea(S.data.areas[i], x, y, 0)) {
        S.data.areas.splice(i, 1);
        rebuildFill();
        return;
      }
    }
  }

  // =========================================================
  //  ためしに あるく
  // =========================================================
  function toggleWalk() {
    if (S.walk) {
      S.walk = null;
      $("walkhint").classList.add("hidden");
      return;
    }
    const st = S.data.markers.find((m) => m.type === "start");
    const a = S.data.areas[0];
    const p = st
      ? { x: st.x, y: st.y }
      : a
      ? { x: a.shape === "circle" ? a.x : a.x + a.w / 2, y: a.shape === "circle" ? a.y : a.y + a.h / 2 }
      : { x: S.data.world.width / 2, y: S.data.world.height / 2 };
    S.walk = { x: p.x, y: p.y, keys: {} };
    S.zoom = Math.max(S.zoom, 0.9);
    $("walkhint").classList.remove("hidden");
  }

  function updateWalk(dt) {
    const w = S.walk;
    if (!w) return;
    let kx = 0,
      ky = 0;
    const k = w.keys;
    if (k["arrowleft"] || k["a"]) kx -= 1;
    if (k["arrowright"] || k["d"]) kx += 1;
    if (k["arrowup"] || k["w"]) ky -= 1;
    if (k["arrowdown"] || k["s"]) ky += 1;
    if (kx || ky) {
      const len = Math.hypot(kx, ky) || 1;
      w.x += (kx / len) * 150 * dt;
      w.y += (ky / len) * 150 * dt;
    }
    // しょうがいぶつから おし出す（ゲームと おなじ しくみ）
    const R = 18;
    const push = (o) => {
      const dx = w.x - o.x,
        dy = w.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = o.r + R;
      if (d < min) {
        if (d < 0.001) w.x = o.x + min;
        else {
          w.x = o.x + (dx / d) * min;
          w.y = o.y + (dy / d) * min;
        }
      }
    };
    for (const o of S.fillCache) push(o);
    for (const o of S.data.objects) push(o);
    w.x = Math.max(20, Math.min(S.data.world.width - 20, w.x));
    w.y = Math.max(20, Math.min(S.data.world.height - 20, w.y));

    // カメラを ついていかせる
    const W = canvas.clientWidth / S.zoom,
      H = canvas.clientHeight / S.zoom;
    S.cam.x = w.x - W / 2;
    S.cam.y = w.y - H / 2;
  }

  function drawWalker() {
    if (!S.walk) return;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(S.walk.x, S.walk.y + 12, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    sprite("👧", S.walk.x, S.walk.y, 42);
  }

  // =========================================================
  //  ファイル
  // =========================================================
  function exportJS() {
    const d = S.data;
    const json = JSON.stringify(d);
    return (
      "/* このファイルは マップ作成ツール（tools/map-editor.html）で 作りました */\n" +
      "/* " + (d.title || "") + " */\n" +
      "window.MAPS = window.MAPS || {};\n" +
      "window.MAPS[" + JSON.stringify(d.name) + "] = /*MAPDATA*/" + json + "/*ENDMAPDATA*/;\n"
    );
  }

  function download(text, filename) {
    const blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function importText(text) {
    let json = null;
    const i = text.indexOf("/*MAPDATA*/"),
      j = text.indexOf("/*ENDMAPDATA*/");
    if (i >= 0 && j > i) json = text.slice(i + 11, j);
    else {
      const a = text.indexOf("{"),
        b = text.lastIndexOf("}");
      if (a >= 0 && b > a) json = text.slice(a, b + 1);
    }
    if (!json) throw new Error("マップの データが 見つかりません");
    const d = JSON.parse(json);
    if (!d.world) throw new Error("マップの かたちが ちがいます");
    d.areas = d.areas || [];
    d.objects = d.objects || [];
    d.decorations = d.decorations || [];
    d.markers = d.markers || [];
    d.fill = Object.assign({ on: true, sprite: "tree", r: 26, gap: 58, jitter: 14, margin: 24, exclude: [] }, d.fill);
    setData(d);
  }

  // めじるしから scenario.js に はりつける コードを 作る
  function scenarioCode() {
    const d = S.data;
    const by = (t) => d.markers.filter((m) => m.type === t);
    const L = [];
    L.push("// ---- index.html に この1ぎょうを ふやす ----");
    L.push('// <script src="js/maps/' + d.name + '.js?v=1"><\\/script>');
    L.push("");
    L.push("// ---- js/scenario.js の いちばん上 ----");
    L.push('const MAP = MapData.build(window.MAPS["' + d.name + '"]);');
    L.push("");
    L.push("// ---- SCENARIO の 中身 ----");
    L.push('  title: "' + (d.title || d.name) + '",');
    L.push("  world: MAP.world,");
    L.push("  obstacles: MAP.obstacles,");
    L.push("  decorations: MAP.decorations,");
    const st = by("start")[0];
    L.push(
      "  player: { x: " + (st ? st.x : 100) + ", y: " + (st ? st.y : 100) + ', sprite: "👧", name: "リイコ" },'
    );
    L.push('  partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },');

    L.push("  enemies: [");
    by("enemy").forEach((m, i) => {
      L.push(
        '    { id: "e' + (i + 1) + '", x: ' + m.x + ", y: " + m.y +
          ', sprite: "😾", name: "ネコ' + (i + 1) + '", maxHp: 16, attack: 3, behavior: "patrol", speed: 45, patrolRange: 110 },'
      );
    });
    by("boss").forEach((m) => {
      L.push(
        '    { id: "boss", x: ' + m.x + ", y: " + m.y +
          ', sprite: "😼", name: "ボス", maxHp: 40, attack: 4, behavior: "shooter", speed: 22, sight: 360, shootInterval: 1.5, bulletSpeed: 150, bulletDamage: 2 },'
      );
    });
    L.push("  ],");

    L.push("  chests: [");
    by("chest").forEach((m, i) => {
      L.push(
        '    { id: "c' + (i + 1) + '", x: ' + m.x + ", y: " + m.y +
          ', key: "かぎ", item: "🔑 かぎ", message: "たからばこを あけた！" },'
      );
    });
    L.push("  ],");

    L.push("  npcs: [");
    by("npc").forEach((m, i) => {
      L.push(
        '    { id: "n' + (i + 1) + '", x: ' + m.x + ", y: " + m.y +
          ', sprite: "🧙", name: "だれか", lines: ["ここに セリフを 書く。"] },'
      );
    });
    L.push("  ],");

    L.push("  gates: [");
    by("gate").forEach((m, i) => {
      L.push(
        '    { id: "g' + (i + 1) + '", x: ' + m.x + ", y: " + m.y +
          ', r: 44, requireKey: "かぎ", requireCount: 3, hudIcon: "🔑",'
      );
      L.push("      wall: wallRow(" + (m.x - 88) + ", " + (m.x + 88) + ", " + m.y + ', 24, 18, "🧱"),');
      L.push('      lockedLines: ["かたく とじている…（{have} / {need}）"], openLines: ["とびらが ひらいた！✨"] },');
    });
    L.push("  ],");

    const ex = by("exit")[0];
    if (ex)
      L.push(
        "  exit: { x: " + ex.x + ", y: " + ex.y + ', r: 46, lines: ["つぎの ステージへ！"] },'
      );
    return L.join("\n");
  }

  // =========================================================
  //  まど
  // =========================================================
  function modal(title, bodyHTML, text) {
    $("modal-title").textContent = title;
    $("modal-body").innerHTML = bodyHTML || "";
    const ta = $("modal-text");
    if (text == null) {
      ta.classList.add("hidden");
      $("modal-copy").classList.add("hidden");
    } else {
      ta.classList.remove("hidden");
      $("modal-copy").classList.remove("hidden");
      ta.value = text;
    }
    $("modal").classList.remove("hidden");
  }
  $("modal-ok").onclick = () => $("modal").classList.add("hidden");
  $("modal-copy").onclick = () => {
    const ta = $("modal-text");
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* だめでも 手で コピーできる */
    }
    $("modal-copy").textContent = "✅ コピーした";
    setTimeout(() => ($("modal-copy").textContent = "📋 コピー"), 1200);
  };

  // =========================================================
  //  よこの バー（どうぐ・パレット）を つくる
  // =========================================================
  function buildUI() {
    const tools = $("tools");
    TOOLS.forEach((t) => {
      const b = document.createElement("button");
      b.innerHTML = '<span class="ic">' + t.ic + "</span>" + t.label;
      b.dataset.tool = t.id;
      b.onclick = () => {
        if (t.id === "walk") {
          toggleWalk();
        } else {
          if (S.walk) toggleWalk();
          S.tool = t.id;
        }
        markTools();
      };
      tools.appendChild(b);
    });

    const kinds = $("kinds");
    Object.keys(M.GROUND_KINDS).forEach((k) => {
      const g = M.GROUND_KINDS[k];
      const b = document.createElement("div");
      b.className = "chip";
      b.dataset.kind = k;
      b.innerHTML = '<span class="sw" style="background:' + g.color + '"></span><span class="lb">' + g.label + "</span>";
      b.onclick = () => {
        S.kind = k;
        if (S.tool.indexOf("ground") !== 0) S.tool = "ground-rect";
        markTools();
      };
      kinds.appendChild(b);
    });

    // ---- パーツ（絵の ボタン）----
    //   絵が ある ものは 絵を、ない ものは 絵文字を そのまま 出す。
    function chipFace(b, spriteName) {
      const a = A.def(spriteName);
      if (a) {
        const im = document.createElement("img");
        im.src = A.url(a.id);
        im.alt = a.label;
        b.classList.add("img");
        b.appendChild(im);
      } else {
        b.textContent = spriteName;
      }
      b.title = A.label(spriteName);
    }

    const parts = $("parts");
    let lastGroup = null;
    M.PARTS.forEach((p) => {
      if (p.group !== lastGroup) {
        lastGroup = p.group;
        const h = document.createElement("div");
        h.className = "grp";
        h.dataset.group = p.group;
        h.textContent = (M.PART_GROUPS || {})[p.group] || p.group;
        parts.appendChild(h);
      }
      const b = document.createElement("div");
      b.className = "chip";
      b.dataset.part = p.sprite;
      b.dataset.find = p.sprite + " " + p.label;
      chipFace(b, p.sprite);
      b.onclick = () => {
        S.part = { sprite: p.sprite, r: p.r };
        S.partR = p.r;
        $("f-partr").value = p.r;
        if (S.tool.indexOf("part") !== 0) S.tool = "part";
        syncForm();
      };
      parts.appendChild(b);
    });

    // ---- さがす（パーツが 多いので）----
    const find = $("f-partfind");
    if (find)
      find.oninput = () => {
        const q = find.value.trim().toLowerCase();
        let shownInGroup = 0;
        let header = null;
        for (const el of parts.children) {
          if (el.className === "grp") {
            if (header) header.classList.toggle("hidden", shownInGroup === 0);
            header = el;
            shownInGroup = 0;
            continue;
          }
          const hit = !q || (el.dataset.find || "").toLowerCase().indexOf(q) >= 0;
          el.classList.toggle("hidden", !hit);
          if (hit) shownInGroup++;
        }
        if (header) header.classList.toggle("hidden", shownInGroup === 0);
      };

    const decos = $("decos");
    M.DECOS.forEach((s) => {
      const b = document.createElement("div");
      b.className = "chip";
      b.dataset.deco = s;
      chipFace(b, s);
      b.onclick = () => {
        S.deco = s;
        S.tool = "deco";
        markTools();
      };
      decos.appendChild(b);
    });

    const mks = $("markers");
    M.MARKERS.forEach((mk) => {
      const b = document.createElement("div");
      b.className = "chip";
      b.dataset.marker = mk.type;
      b.title = mk.label;
      b.innerHTML = mk.sprite + '<span class="lb">' + mk.label + "</span>";
      b.onclick = () => {
        S.marker = mk.type;
        S.tool = "marker";
        markTools();
      };
      mks.appendChild(b);
    });

    const fps = $("fillparts");
    (M.FILL_PARTS || []).forEach((s) => {
      const b = document.createElement("div");
      b.className = "chip";
      b.dataset.fillpart = s;
      chipFace(b, s);
      b.onclick = () => {
        snapshot();
        S.data.fill.sprite = s;
        rebuildFill();
        markTools();
        save();
      };
      fps.appendChild(b);
    });
  }

  function markTools() {
    document.querySelectorAll("#tools button").forEach((b) => {
      b.classList.toggle("on", b.dataset.tool === S.tool || (b.dataset.tool === "walk" && !!S.walk));
    });
    document.querySelectorAll("#kinds .chip").forEach((b) => b.classList.toggle("on", b.dataset.kind === S.kind));
    document.querySelectorAll("#parts .chip").forEach((b) => b.classList.toggle("on", b.dataset.part === S.part.sprite));
    document.querySelectorAll("#decos .chip").forEach((b) => b.classList.toggle("on", b.dataset.deco === S.deco));
    document.querySelectorAll("#markers .chip").forEach((b) => b.classList.toggle("on", b.dataset.marker === S.marker));
    document
      .querySelectorAll("#fillparts .chip")
      .forEach((b) => b.classList.toggle("on", b.dataset.fillpart === S.data.fill.sprite));
  }

  // ---- すうじの ぶぶんを がめんに あわせる ----
  function syncForm() {
    const d = S.data;
    $("f-name").value = d.name;
    $("f-title").value = d.title || "";
    $("f-w").value = d.world.width;
    $("f-h").value = d.world.height;
    $("f-ground").value = d.world.ground;
    $("f-fillon").checked = !!d.fill.on;
    $("f-fillr").value = d.fill.r;
    $("f-fillgap").value = d.fill.gap;
    $("f-filljit").value = d.fill.jitter;
    $("f-fillmargin").value = d.fill.margin;
    $("f-brush").value = S.brushR;
    $("f-partr").value = S.partR;
    $("f-space").value = S.space;
    $("f-jit").value = S.jitter;
    $("f-grid").checked = S.grid;
    $("f-hit").checked = S.hit;
    $("f-snap").value = String(S.snap);
    labels();
    markTools();
  }
  function labels() {
    $("v-brush").textContent = S.brushR;
    $("v-partr").textContent = S.partR;
    $("v-space").textContent = S.space;
    $("v-jit").textContent = S.jitter;
    $("v-fillr").textContent = S.data.fill.r;
    $("v-fillgap").textContent = S.data.fill.gap;
    $("v-filljit").textContent = S.data.fill.jitter;
    $("v-fillmargin").textContent = S.data.fill.margin;
  }

  // ---- そうさの ひもづけ ----
  function bind() {
    $("f-name").oninput = (e) => {
      S.data.name = e.target.value.trim().replace(/\s+/g, "_") || "stage2";
      save();
    };
    $("f-title").oninput = (e) => {
      S.data.title = e.target.value;
      save();
    };
    const sizeChange = () => {
      snapshot();
      S.data.world.width = Math.max(600, Math.min(12000, +$("f-w").value || 1400));
      S.data.world.height = Math.max(600, Math.min(12000, +$("f-h").value || 2200));
      rebuildFill();
      save();
    };
    $("f-w").onchange = sizeChange;
    $("f-h").onchange = sizeChange;
    $("f-ground").oninput = (e) => {
      S.data.world.ground = e.target.value;
      save();
    };

    $("f-brush").oninput = (e) => {
      S.brushR = +e.target.value;
      labels();
    };
    $("f-partr").oninput = (e) => {
      S.partR = +e.target.value;
      labels();
    };
    $("f-space").oninput = (e) => {
      S.space = +e.target.value;
      labels();
    };
    $("f-jit").oninput = (e) => {
      S.jitter = +e.target.value;
      labels();
    };

    const fillChange = (key) => (e) => {
      S.data.fill[key] = key === "on" ? e.target.checked : +e.target.value;
      rebuildFill();
      labels();
      save();
    };
    $("f-fillon").onchange = fillChange("on");
    $("f-fillr").onchange = fillChange("r");
    $("f-fillgap").onchange = fillChange("gap");
    $("f-filljit").onchange = fillChange("jitter");
    $("f-fillmargin").onchange = fillChange("margin");
    ["f-fillr", "f-fillgap", "f-filljit", "f-fillmargin"].forEach((id) => {
      $(id).oninput = (e) => {
        $("v-" + id.slice(2)).textContent = e.target.value;
      };
    });
    $("b-fillreset").onclick = () => {
      snapshot();
      S.excludeSet = new Set();
      S.data.fill.exclude = [];
      rebuildFill();
      save();
    };

    $("f-grid").onchange = (e) => (S.grid = e.target.checked);
    $("f-hit").onchange = (e) => (S.hit = e.target.checked);
    $("f-snap").onchange = (e) => (S.snap = +e.target.value);
    $("b-fit").onclick = fitView;

    $("b-undo").onclick = undo;
    $("b-redo").onclick = redo;

    $("b-new").onclick = () => {
      if (!confirm("いまの マップを けして、さいしょから 作りますか？")) return;
      setData(newData());
    };

    $("b-save").onclick = () => {
      const name = S.data.name + ".js";
      download(exportJS(), name);
      modal(
        "💾 ファイルに だしました",
        "<b>" + name + "</b> を ダウンロードしました。<br>" +
          "1. そのファイルを <code>js/maps/</code> に いれる<br>" +
          "2. <code>index.html</code> に <code>&lt;script src=\"js/maps/" + name + "\"&gt;&lt;/script&gt;</code> を ふやす<br>" +
          "3. <code>js/scenario.js</code> で <code>MapData.build(window.MAPS[\"" + S.data.name + "\"])</code> を つかう<br><br>" +
          "くわしい コードは「📋 シナリオ用コード」ボタンで 出ます。"
      );
    };

    $("b-code").onclick = () => {
      modal(
        "📋 シナリオ用の コード",
        "めじるしの ばしょから 作りました。<code>js/scenario.js</code> に はりつけて、なまえや セリフを 書きかえて ください。",
        scenarioCode()
      );
    };

    $("b-open").onclick = () => $("f-file").click();
    $("f-file").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          importText(String(rd.result));
        } catch (err) {
          modal("よみこめませんでした", String(err.message || err));
        }
      };
      rd.readAsText(f);
      e.target.value = "";
    };

    $("b-help").onclick = help;

    // よういされた ステージを よむ
    const sel = $("f-maps");
    if (sel && window.MAPS) {
      Object.keys(window.MAPS).forEach((k) => {
        const o = document.createElement("option");
        o.value = k;
        o.textContent = k;
        sel.appendChild(o);
      });
      $("b-loadmap").onclick = () => {
        const k = sel.value;
        if (!k || !window.MAPS[k]) return;
        if (!confirm("「" + k + "」を よみこみます。いまの さぎょうは きえます。いい？")) return;
        setData(JSON.parse(JSON.stringify(window.MAPS[k])));
      };
    }

    window.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const k = e.key.toLowerCase();
      if (S.walk) S.walk.keys[k] = true;
      if (k === " ") S.space_ = true;
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && k === "y") {
        e.preventDefault();
        redo();
      }
      if (k === "escape") $("modal").classList.add("hidden");
      if (k === "[") {
        S.brushR = Math.max(20, S.brushR - 10);
        syncForm();
      }
      if (k === "]") {
        S.brushR = Math.min(220, S.brushR + 10);
        syncForm();
      }
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      if (S.walk) S.walk.keys[k] = false;
      if (k === " ") S.space_ = false;
    });
  }

  function help() {
    modal(
      "❓ つかいかた",
      "<b>1. じめんを おく</b><br>" +
        "「じめん□」「じめん◯」「じめん ふで」で <b>あるける ところ</b> を かきます。<br><br>" +
        "<b>2. まわりは じどうで 森に なる</b><br>" +
        "じめん いがいの ところは、「🌲 まわりを うめる」の パーツ（木・かべ）で じどうで うまります。" +
        "木を 1本ずつ おく ひつようは ありません。<br>" +
        "こみぐあい／ばらつき／みちの ひろさ を うごかすと 森の かんじが かわります。<br><br>" +
        "<b>3. パーツを ならべる</b><br>" +
        "「パーツを おく」＝ドラッグで つづけて おく／「ならべる」＝まっすぐ 1れつ（かべ に べんり）／" +
        "「うめる」＝しかくい ところ を いっきに うめる。<br>" +
        "パーツは 木・いわ・たてもの…と なかま分けして います。多いので " +
        "<b>さがす まど</b> に「き」「いわ」「いえ」などと 書くと しぼれます。<br><br>" +
        "<b>4. けす</b><br>" +
        "「けす🧽」は パーツ・かざり・めじるし・じどうの 木 を けします（ふとさは [ ] キー）。" +
        "じめんは 「じめんを けす✂️」で けします。<br><br>" +
        "<b>5. たしかめる</b><br>" +
        "「ためしに あるく▶」で WASD／やじるし。とおれない みちが ないか チェック。<br>" +
        "「ぶつかる まる」を 出すと あたり判定が 見えます。<br><br>" +
        "<b>6. ほぞん</b><br>" +
        "「ファイルに だす」→ <code>js/maps/</code> に いれる。<br>" +
        "「シナリオ用コード」→ <code>js/scenario.js</code> に はりつけ。<br><br>" +
        "そのほか：マウスホイールで 大きさ／まん中ボタン（か スペース）で うごかす／Ctrl+Z で もどす。" +
        "さぎょうは この パソコンに じどうで ほぞんされます。"
    );
  }

  // =========================================================
  //  はじまり
  // =========================================================
  function loop(ts) {
    const dt = Math.min((ts - S.last) / 1000 || 0, 0.05);
    S.last = ts;
    updateWalk(dt);
    render();
    requestAnimationFrame(loop);
  }

  buildUI();
  bind();

  let start = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) start = JSON.parse(raw);
  } catch (e) {
    start = null;
  }
  S.data = start && start.world ? start : newData();
  S.excludeSet = new Set(S.data.fill.exclude || []);
  rebuildFill();
  syncForm();
  resize();
  fitView();
  requestAnimationFrame(loop);
})();
