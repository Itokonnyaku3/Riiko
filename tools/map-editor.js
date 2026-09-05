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

    // ---- イベント モード ----
    mode: "terrain", // "terrain" | "events"
    evTool: "npc", // いま おく イベントの しゅるい
    selected: null, // { kind, index } えらんで いる イベント
    evDrag: null, // ドラッグで 動かして いる イベント
  };

  // ---- イベントの しゅるい 一らん ----
  //   kind: S.data の どの はいれつ／もの か。single のものは 1面に 1つ だけ。
  const EVENT_TYPES = [
    { kind: "start", ic: "👧", label: "スタート", single: true },
    { kind: "npc", ic: "🧙", label: "NPC" },
    { kind: "enemy", ic: "😾", label: "てき" },
    { kind: "chest", ic: "🎁", label: "たからばこ" },
    { kind: "checkpoint", ic: "🚩", label: "チェックポイント" },
    { kind: "trigger", ic: "⚡", label: "トリガー" },
    { kind: "gate", ic: "🚪", label: "とびら" },
    { kind: "exit", ic: "⛩️", label: "出口", single: true },
  ];
  function eventDef(kind) { return EVENT_TYPES.find((t) => t.kind === kind); }
  const PLURAL = {
    npc: "npcs", enemy: "enemies", chest: "chests",
    checkpoint: "checkpoints", trigger: "triggers", gate: "gates",
  };
  // その イベントが 入っている はいれつ を とる（start／exit は 単体なので null）
  function evList(kind) {
    return PLURAL[kind] ? S.data[PLURAL[kind]] : null;
  }

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
      // ---- イベント（マップ作成ツールの「🎬 イベント」で 作る）----
      player: null,
      npcs: [],
      enemies: [],
      chests: [],
      checkpoints: [],
      triggers: [],
      gates: [],
      exit: null,
      hints: [],
      intro: null,
    };
  }
  // ふるい マップ ファイル（イベントの ぶぶんが ない）を よみこんだ ときの おぎない
  function fillEventDefaults(d) {
    d.player = d.player || null;
    d.npcs = d.npcs || [];
    d.enemies = d.enemies || [];
    d.chests = d.chests || [];
    d.checkpoints = d.checkpoints || [];
    d.triggers = d.triggers || [];
    d.gates = d.gates || [];
    d.exit = d.exit || null;
    d.hints = d.hints || [];
    d.intro = d.intro || null;
    return d;
  }

  function setData(d) {
    S.data = fillEventDefaults(d);
    closeInspector();
    S.excludeSet = new Set(d.fill.exclude || []);
    S.undo.length = 0;
    S.redo.length = 0;
    rebuildFill();
    syncForm();
    renderEventPanels();
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
    S.data = fillEventDefaults(JSON.parse(json));
    S.selected = null;
    closeInspector();
    S.excludeSet = new Set(S.data.fill.exclude || []);
    rebuildFill();
    syncForm();
    renderEventPanels();
    save();
  }

  // まわりを うめる パーツを 計算しなおす（じめんを かえた ときだけ）
  function rebuildFill() {
    S.fillCache = M.buildFill(S.data);
  }

  let saveTimer = 0;
  function updateSyncIndicator(msg, isHighlight) {
    const el = $("sync-status");
    if (!el) return;
    el.textContent = msg || "🟢 自動連携中";
    if (isHighlight) {
      el.classList.add("saved");
      setTimeout(() => el.classList.remove("saved"), 1200);
    }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const jsonStr = JSON.stringify(S.data);
        localStorage.setItem(SAVE_KEY, jsonStr);
        if (S.data && S.data.name) {
          localStorage.setItem("riiko.map." + String(S.data.name).toLowerCase(), jsonStr);
        }
        localStorage.setItem("riiko.map.last_updated", String(Date.now()));

        if (typeof BroadcastChannel !== "undefined") {
          try {
            const ch = new BroadcastChannel("riiko-map-sync");
            ch.postMessage({
              type: "map-updated",
              stageId: S.data.name,
              timestamp: Date.now(),
              map: S.data,
            });
            ch.close();
          } catch (e) {}
        }
        updateSyncIndicator("🟢 本番に即時反映中", true);
      } catch (e) {
        /* いっぱいの ときは あきらめる */
      }
    }, 100);
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

  // キャラクター画像（WALKS）のキャッシュと描画
  const walkImgCache = {};
  function getWalkImg(path) {
    if (!path) return null;
    let fullPath = path;
    if (fullPath.startsWith("assets/")) fullPath = "../" + fullPath;
    if (!walkImgCache[fullPath]) {
      const img = new Image();
      img.src = fullPath;
      walkImgCache[fullPath] = img;
    }
    return walkImgCache[fullPath];
  }

  function drawWalkSprite(walkObj, dir, frame, x, y, size) {
    if (!walkObj) return false;
    const paths = walkObj[dir || "down"];
    if (!paths) return false;
    const path = Array.isArray(paths) ? paths[frame || 0] : paths;
    const img = getWalkImg(path);
    if (!img || !img.complete || img.naturalWidth === 0) return false;
    const s = size || 68;
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    return true;
  }

  function drawEventTag(text, x, y) {
    if (!text) return;
    ctx.save();
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const m = ctx.measureText(text);
    const pad = 3;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - m.width / 2 - pad, y - 7 - pad, m.width + pad * 2, 14 + pad * 2);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

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
    ctx.fillStyle = (typeof Assets !== "undefined" && Assets.getGroundPattern)
      ? Assets.getGroundPattern(ctx, d.world.ground, d.world.ground)
      : d.world.ground;
    ctx.fillRect(0, 0, d.world.width, d.world.height);

    // あるける じめん（パス1: 接地影）
    ctx.fillStyle = "rgba(0, 0, 0, 0.09)";
    for (const a of d.areas) {
      if (a.kind !== "dirt" && a.kind !== "stone" && a.kind !== "stone2") continue;
      if (a.shape === "circle") {
        ctx.beginPath();
        ctx.arc(a.x, a.y + 1.5, a.r + 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRect(a.x - 2, a.y, a.w + 4, a.h + 3.5, Math.min(18, a.w / 2, a.h / 2) + 2);
        ctx.fill();
      }
    }

    // あるける じめん（パス2: 本体テクスチャ）
    for (const a of d.areas) {
      const col = (M.GROUND_KINDS[a.kind] || {}).color || "#8fca7a";
      ctx.fillStyle = (typeof Assets !== "undefined" && Assets.getGroundPattern)
        ? Assets.getGroundPattern(ctx, a.kind, col)
        : col;
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
        const ds = o.size || (A.def(o.sprite) && A.def(o.sprite).size) || 30;
        if (on(o, 40)) A.drawDeco(ctx, o.sprite, o.x, o.y, ds);
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

    drawEvents();
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

    // まん中ボタン・右ボタン・スペースキー押下中・walk中 は「うごかす」
    if (ev.button === 1 || ev.button === 2 || S.space_ || S.walk) {
      S.drag = { tool: "pan", px: ev.clientX, py: ev.clientY, button: ev.button };
      if (S.space_ || ev.button === 1 || ev.button === 2) {
        canvas.style.cursor = "grabbing";
      }
      return;
    }
    if (S.mode === "events") { startEventTool(w.x, w.y); return; }
    startTool(w.x, w.y);
  });

  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

  canvas.addEventListener("pointermove", (ev) => {
    const w = toWorld(ev.clientX, ev.clientY);
    S.mouse.x = w.x;
    S.mouse.y = w.y;
    S.mouse.on = true;
    if (S.mode === "events" && S.evDrag) { moveEventTool(w.x, w.y); return; }
    const dg = S.drag;
    if (!dg) return;
    if (dg.tool === "pan") {
      S.cam.x -= (ev.clientX - dg.px) / S.zoom;
      S.cam.y -= (ev.clientY - dg.py) / S.zoom;
      dg.px = ev.clientX;
      dg.py = ev.clientY;
      if (S.space_ || dg.button === 1 || dg.button === 2) {
        canvas.style.cursor = "grabbing";
      }
      return;
    }
    moveTool(w.x, w.y);
  });

  canvas.addEventListener("pointerup", (ev) => {
    const w = toWorld(ev.clientX, ev.clientY);
    if (S.drag && S.drag.tool === "pan") {
      canvas.style.cursor = S.space_ ? "grab" : "";
    }
    if (S.mode === "events") endEventTool();
    if (S.drag && S.drag.tool !== "pan") endTool(w.x, w.y);
    S.drag = null;
  });
  canvas.addEventListener("pointerleave", () => {
    S.mouse.on = false;
    if (!S.drag && !S.space_) canvas.style.cursor = "";
  });

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
  //  イベント モード（てき・NPC・トリガー・ヒント・オープニング）
  //    ここで あつかう データは js/maps/◯◯.js に そのまま 入り、
  //    js/mapdata.js の build() を とおって ゲームで つかわれます。
  // =========================================================

  // ---- なまえの じゅんばん（かぶらない id を つくる）----
  function nextId(prefix) {
    const used = new Set();
    ["npcs", "enemies", "chests", "checkpoints", "triggers", "gates"].forEach((k) =>
      (S.data[k] || []).forEach((o) => o.id && used.add(o.id))
    );
    let n = 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }

  // ---- とびらの かべ（requireKey が そろうまで ふさぐ 障害物）を つくりなおす ----
  function wallRow(x0, x1, y, r, gap, spr) {
    const out = [];
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += gap) out.push({ x, y, r, sprite: spr });
    return out;
  }
  function regenerateGateWall(g) {
    const span = g.wallSpan || 88, r = g.wallR || 24, gap = g.wallGap || 18, spr = g.wallSprite || "🧱";
    g.wall = wallRow(g.x - span, g.x + span, g.y, r, gap, spr);
  }

  // ---- あたらしい イベントの もとの かたち ----
  function defaultEvent(kind, x, y) {
    const p = { x: cx(x), y: cy(y) };
    if (kind === "npc") return { id: nextId("n"), ...p, sprite: "🧙", name: "だれか", lines: ["ここに セリフを 書く。"] };
    if (kind === "enemy")
      return {
        id: nextId("e"), ...p, sprite: "😾", name: "ネコ", maxHp: 16, attack: 3,
        behavior: "patrol", speed: 45, patrolRange: 100, remember: true, walk: true,
      };
    if (kind === "chest") return { id: nextId("c"), ...p, key: "かぎ", item: "🔑 かぎ", message: "たからばこを あけた！" };
    if (kind === "checkpoint") return { id: nextId("cp"), ...p, r: 70 };
    if (kind === "trigger") return { id: nextId("tg"), ...p, r: 70, mutter: "" };
    if (kind === "gate") {
      const g = {
        id: nextId("g"), ...p, r: 44, requireKey: "かぎ", requireCount: 1, hudIcon: "🔑",
        lockedLines: ["かたく とじている…（{have} / {need}）"], openLines: ["とびらが ひらいた！✨"],
        wallSpan: 88, wallR: 24, wallGap: 18, wallSprite: "🧱",
      };
      regenerateGateWall(g);
      return g;
    }
    if (kind === "exit") return { ...p, r: 50, requireBoss: false, label: "つぎへ", lines: ["つぎの ステージへ！"] };
    if (kind === "start") return { ...p, sprite: "👧", size: 68, name: "リイコ", maxHp: 3, attack: 5 };
  }

  // ---- kind の はいれつ（start／exit は 単体なので null）----
  function getEvent(kind, index) {
    if (kind === "start") return S.data.player;
    if (kind === "exit") return S.data.exit;
    const list = evList(kind);
    return list ? list[index] : null;
  }

  // ---- クリックの ちかくに ある イベントを さがす ----
  function findEventAt(x, y) {
    const thresh = 24 / S.zoom;
    let best = null, bd = thresh;
    const test = (kind, ox, oy, index) => {
      const d = Math.hypot(ox - x, oy - y);
      if (d < bd) { bd = d; best = { kind, index }; }
    };
    const d = S.data;
    if (d.player) test("start", d.player.x, d.player.y, -1);
    if (d.exit) test("exit", d.exit.x, d.exit.y, -1);
    (d.npcs || []).forEach((o, i) => test("npc", o.x, o.y, i));
    (d.enemies || []).forEach((o, i) => test("enemy", o.x, o.y, i));
    (d.chests || []).forEach((o, i) => test("chest", o.x, o.y, i));
    (d.checkpoints || []).forEach((o, i) => test("checkpoint", o.x, o.y, i));
    (d.triggers || []).forEach((o, i) => test("trigger", o.x, o.y, i));
    (d.gates || []).forEach((o, i) => test("gate", o.x, o.y, i));
    return best;
  }

  // ---- おく／うごかす ----
  function startEventTool(x, y) {
    const hit = findEventAt(x, y);
    if (hit) {
      S.evDrag = hit;
      openInspector(hit.kind, hit.index);
      return;
    }
    const kind = S.evTool;
    const def = eventDef(kind);
    snapshot();
    if (def.single) {
      const cur = getEvent(kind, -1);
      if (cur) {
        cur.x = cx(x);
        cur.y = cy(y);
        S.evDrag = { kind, index: -1 };
      } else {
        if (kind === "start") S.data.player = defaultEvent(kind, x, y);
        else S.data.exit = defaultEvent(kind, x, y);
      }
      openInspector(kind, -1);
    } else {
      const list = evList(kind);
      list.push(defaultEvent(kind, x, y));
      S.evDrag = { kind, index: list.length - 1 };
      openInspector(kind, list.length - 1);
    }
    save();
  }
  function moveEventTool(x, y) {
    if (!S.evDrag) return;
    const ev = getEvent(S.evDrag.kind, S.evDrag.index);
    if (!ev) return;
    ev.x = cx(x);
    ev.y = cy(y);
    if (S.evDrag.kind === "gate") regenerateGateWall(ev);
  }
  function endEventTool() {
    if (S.evDrag) {
      save();
      if (S.selected && S.selected.kind === S.evDrag.kind && S.selected.index === S.evDrag.index) renderInspector();
    }
    S.evDrag = null;
  }

  // ---- イベントの アイコンを かく ----
  function drawEvents() {
    if (S.mode !== "events") return;
    const d = S.data;
    const on = (o, m) => {
      const W = canvas.clientWidth, H = canvas.clientHeight, z = S.zoom;
      return o.x > S.cam.x - m && o.x < S.cam.x + W / z + m && o.y > S.cam.y - m && o.y < S.cam.y + H / z + m;
    };
    const isSel = (kind, index) => !!S.selected && S.selected.kind === kind && S.selected.index === index;
    const drawOne = (kind, o, index) => {
      if (!on(o, 100)) return;
      const def = eventDef(kind);
      const sel = isSel(kind, index);
      if (o.r) {
        ctx.strokeStyle = sel ? "rgba(255,230,168,0.9)" : "rgba(120,190,255,0.5)";
        ctx.lineWidth = (sel ? 2.5 : 1.5) / S.zoom;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = sel ? "rgba(255,230,168,0.6)" : "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(o.x, o.y, 24, 0, Math.PI * 2);
      ctx.fill();

      let drawn = false;
      let label = "";
      if (kind === "start") {
        drawn = drawWalkSprite(window.WALKS && window.WALKS.player, "down", 0, o.x, o.y, o.size || 68);
        label = "スタート";
      } else if (kind === "npc") {
        const wKey = o.walkKey || o.walk;
        const wData = (window.WALKS && wKey && window.WALKS[wKey]) || (window.WALKS && window.WALKS[o.id]);
        drawn = drawWalkSprite(wData, "down", 0, o.x, o.y, o.size || 76);
        label = o.name || "NPC";
      } else if (kind === "enemy") {
        const isDummy = o.behavior === "dummy";
        const wKey = o.walkKey || (isDummy ? "kakashi" : (typeof o.walk === "string" ? o.walk : "enemy"));
        const wData = (window.WALKS && window.WALKS[wKey]) || (isDummy ? (window.WALKS && window.WALKS.kakashi) : (window.WALKS && window.WALKS.enemy));
        const isBat = wKey === "bat" || o.sprite === "🦇";
        if (isBat) {
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.ellipse(o.x, o.y + 10, 16, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawn = drawWalkSprite(wData, "down", 0, o.x, o.y + (isBat ? -10 : 0), o.size || (isDummy ? 80 : 72));
        label = o.name || (isDummy ? "かかし" : "てき");
      } else if (kind === "exit") {
        label = o.label || "出口";
      } else if (kind === "chest") {
        label = o.item ? "宝:" + o.item : "宝箱";
      }

      if (!drawn) {
        sprite(o.sprite || def.ic, o.x, o.y, 32);
      }
      if (label && S.zoom >= 0.35) {
        drawEventTag(label, o.x, o.y - 30);
      }
    };
    if (d.player) drawOne("start", d.player, -1);
    if (d.exit) drawOne("exit", d.exit, -1);
    (d.npcs || []).forEach((o, i) => drawOne("npc", o, i));
    (d.enemies || []).forEach((o, i) => drawOne("enemy", o, i));
    (d.chests || []).forEach((o, i) => drawOne("chest", o, i));
    (d.checkpoints || []).forEach((o, i) => drawOne("checkpoint", o, i));
    (d.triggers || []).forEach((o, i) => drawOne("trigger", o, i));
    (d.gates || []).forEach((o, i) => drawOne("gate", o, i));
    // ヒントの 行き先（うすい 光る まる）
    (d.hints || []).forEach((h) => {
      if (!h.point || !on(h.point, 40)) return;
      ctx.fillStyle = "rgba(255,220,120,0.7)";
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, 10, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // =========================================================
  //  えらんだ イベントの 編集パネル（みぎ）
  // =========================================================
  function openInspector(kind, index) {
    S.selected = { kind, index };
    $("inspector").classList.remove("hidden");
    renderInspector();
  }
  function closeInspector() {
    S.selected = null;
    S.evDrag = null;
    $("inspector").classList.add("hidden");
  }

  // ---- ぶひんの ちいさな つくりかた ----
  function fieldRow(labelText, inputEl) {
    const row = document.createElement("label");
    row.appendChild(document.createTextNode(labelText));
    row.appendChild(inputEl);
    return row;
  }
  function textInput(value, onChange) {
    const el = document.createElement("input");
    el.type = "text";
    el.value = value == null ? "" : value;
    el.oninput = () => onChange(el.value);
    return el;
  }
  function numberInput(value, onChange, opts) {
    const el = document.createElement("input");
    el.type = "number";
    el.value = value == null ? 0 : value;
    if (opts && opts.step) el.step = opts.step;
    el.oninput = () => onChange(+el.value || 0);
    return el;
  }
  function optionalNumberInput(value, onChange, opts) {
    const el = document.createElement("input");
    el.type = "number";
    el.value = value == null ? "" : value;
    if (opts && opts.step) el.step = opts.step;
    el.oninput = () => onChange(el.value === "" ? null : +el.value);
    return el;
  }
  function checkboxInput(checked, onChange) {
    const el = document.createElement("input");
    el.type = "checkbox";
    el.checked = !!checked;
    el.onchange = () => onChange(el.checked);
    return el;
  }
  function selectInput(value, options, onChange) {
    const el = document.createElement("select");
    options.forEach((o) => {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      if (o.value === value) op.selected = true;
      el.appendChild(op);
    });
    el.onchange = () => onChange(el.value);
    return el;
  }
  function textareaLines(arr, onChange) {
    const el = document.createElement("textarea");
    el.value = (arr || []).join("\n");
    el.oninput = () => onChange(el.value.split("\n"));
    return el;
  }
  function textareaSingle(value, onChange) {
    const el = document.createElement("textarea");
    el.value = value || "";
    el.oninput = () => onChange(el.value);
    return el;
  }
  function row2(a, b) {
    const r = document.createElement("div");
    r.className = "row2";
    r.appendChild(a);
    r.appendChild(b);
    return r;
  }
  function checkLabel(text, checked, onChange) {
    const l = document.createElement("label");
    l.style.flexDirection = "row";
    l.style.alignItems = "center";
    l.style.gap = "6px";
    l.appendChild(checkboxInput(checked, onChange));
    l.appendChild(document.createTextNode(text));
    return l;
  }

  // ---- variants（じょうけんつきの せりふ）の へんしゅう ----
  function variantsEditor(container, variants, onChange) {
    variants.forEach((v, i) => {
      const box = document.createElement("div");
      box.className = "box";
      const head = document.createElement("div");
      head.className = "box-head";
      const b = document.createElement("b");
      b.textContent = "だん " + (i + 1);
      head.appendChild(b);
      const btns = document.createElement("span");
      if (i > 0) {
        const up = document.createElement("button");
        up.className = "small"; up.textContent = "↑";
        up.onclick = () => { const t = variants[i - 1]; variants[i - 1] = variants[i]; variants[i] = t; onChange(); renderInspector(); };
        btns.appendChild(up);
      }
      if (i < variants.length - 1) {
        const dn = document.createElement("button");
        dn.className = "small"; dn.textContent = "↓";
        dn.onclick = () => { const t = variants[i + 1]; variants[i + 1] = variants[i]; variants[i] = t; onChange(); renderInspector(); };
        btns.appendChild(dn);
      }
      const del = document.createElement("button");
      del.className = "small"; del.textContent = "✕";
      del.onclick = () => { variants.splice(i, 1); onChange(); renderInspector(); };
      btns.appendChild(del);
      head.appendChild(btns);
      box.appendChild(head);
      box.appendChild(row2(
        fieldRow("minTalks（なんかいめから）", optionalNumberInput(v.minTalks, (val) => { if (val == null) delete v.minTalks; else v.minTalks = val; onChange(); })),
        fieldRow("if（この フラグの ときだけ）", textInput(v.if || "", (val) => { if (val) v.if = val; else delete v.if; onChange(); }))
      ));
      box.appendChild(fieldRow("ifNot（この フラグが ない ときだけ）", textInput(v.ifNot || "", (val) => { if (val) v.ifNot = val; else delete v.ifNot; onChange(); })));
      box.appendChild(textareaLines(v.lines, (arr) => { v.lines = arr; onChange(); }));
      container.appendChild(box);
    });
    const add = document.createElement("button");
    add.className = "wide"; add.textContent = "＋ だんを ふやす";
    add.onclick = () => { variants.push({ lines: ["ここに セリフを 書く。"] }); onChange(); renderInspector(); };
    container.appendChild(add);
  }

  // ---- カットシーン（コマの れつ）の へんしゅう。トリガーと オープニングで つかいまわす ----
  function stepKind(step) {
    if (step.look) return "look";
    if (step.spawn) return "spawn";
    if (step.move) return "move";
    if (step.despawn) return "despawn";
    if (step.name !== undefined || step.lines) return "say";
    return "wait";
  }
  function defaultStepData(kind) {
    if (kind === "look") return { look: { x: 0, y: 0 } };
    if (kind === "spawn") return { spawn: { id: "a1", x: 0, y: 0, sprite: "🧑", size: 50, name: "" } };
    if (kind === "move") return { move: { id: "a1", x: 0, y: 0, sec: 1 } };
    if (kind === "despawn") return { despawn: [] };
    if (kind === "say") return { name: "", lines: [""] };
    return {};
  }
  const STEP_KIND_OPTS = [
    { value: "look", label: "👀 look（カメラを むける）" },
    { value: "spawn", label: "✨ spawn（キャラを 出す）" },
    { value: "move", label: "🚶 move（キャラを うごかす）" },
    { value: "despawn", label: "💨 despawn（キャラを 消す）" },
    { value: "say", label: "💬 say（せりふ）" },
    { value: "wait", label: "⏱ wait/sfx だけ" },
  ];
  function cutsceneEditor(container, cutscene, onChange, rerender) {
    cutscene.steps = cutscene.steps || [];
    cutscene.steps.forEach((step, i) => {
      const row = document.createElement("div");
      row.className = "step-row";
      const top = document.createElement("div");
      top.className = "step-top";
      top.appendChild(selectInput(stepKind(step), STEP_KIND_OPTS, (v) => {
        const wait = step.wait, sfx = step.sfx;
        Object.keys(step).forEach((k) => delete step[k]);
        Object.assign(step, defaultStepData(v));
        if (wait != null) step.wait = wait;
        if (sfx != null) step.sfx = sfx;
        onChange(); rerender();
      }));
      if (i > 0) {
        const up = document.createElement("button");
        up.className = "small"; up.textContent = "↑";
        up.onclick = () => { const t = cutscene.steps[i - 1]; cutscene.steps[i - 1] = cutscene.steps[i]; cutscene.steps[i] = t; onChange(); rerender(); };
        top.appendChild(up);
      }
      if (i < cutscene.steps.length - 1) {
        const dn = document.createElement("button");
        dn.className = "small"; dn.textContent = "↓";
        dn.onclick = () => { const t = cutscene.steps[i + 1]; cutscene.steps[i + 1] = cutscene.steps[i]; cutscene.steps[i] = t; onChange(); rerender(); };
        top.appendChild(dn);
      }
      const del = document.createElement("button");
      del.className = "small"; del.textContent = "✕";
      del.onclick = () => { cutscene.steps.splice(i, 1); onChange(); rerender(); };
      top.appendChild(del);
      row.appendChild(top);

      const kind = stepKind(step);
      if (kind === "look") {
        row.appendChild(row2(
          fieldRow("x", numberInput(step.look.x, (v) => { step.look.x = v; onChange(); })),
          fieldRow("y", numberInput(step.look.y, (v) => { step.look.y = v; onChange(); }))
        ));
      } else if (kind === "spawn") {
        row.appendChild(fieldRow("id", textInput(step.spawn.id, (v) => { step.spawn.id = v; onChange(); })));
        row.appendChild(row2(
          fieldRow("x", numberInput(step.spawn.x, (v) => { step.spawn.x = v; onChange(); })),
          fieldRow("y", numberInput(step.spawn.y, (v) => { step.spawn.y = v; onChange(); }))
        ));
        row.appendChild(row2(
          fieldRow("絵", textInput(step.spawn.sprite || "", (v) => { step.spawn.sprite = v; onChange(); })),
          fieldRow("大きさ", numberInput(step.spawn.size || 50, (v) => { step.spawn.size = v; onChange(); }))
        ));
        row.appendChild(fieldRow("名前", textInput(step.spawn.name || "", (v) => { step.spawn.name = v; onChange(); })));
      } else if (kind === "move") {
        row.appendChild(fieldRow("id", textInput(step.move.id, (v) => { step.move.id = v; onChange(); })));
        row.appendChild(row2(
          fieldRow("x", numberInput(step.move.x, (v) => { step.move.x = v; onChange(); })),
          fieldRow("y", numberInput(step.move.y, (v) => { step.move.y = v; onChange(); }))
        ));
        row.appendChild(fieldRow("秒（sec）", numberInput(step.move.sec || 1, (v) => { step.move.sec = v; onChange(); }, { step: 0.1 })));
        row.appendChild(fieldRow("いっしょに 動かす id（かんまくぎり）", textInput((step.move.with || []).join(","), (v) => {
          const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
          if (arr.length) step.move.with = arr; else delete step.move.with;
          onChange();
        })));
      } else if (kind === "despawn") {
        row.appendChild(fieldRow("消す id（かんまくぎり）", textInput((step.despawn || []).join(","), (v) => {
          step.despawn = v.split(",").map((s) => s.trim()).filter(Boolean);
          onChange();
        })));
      } else if (kind === "say") {
        row.appendChild(fieldRow("名前", textInput(step.name || "", (v) => { step.name = v; onChange(); })));
        row.appendChild(textareaLines(step.lines, (arr) => { step.lines = arr; onChange(); }));
      }
      row.appendChild(row2(
        fieldRow("wait（秒。空で なし）", optionalNumberInput(step.wait, (v) => { if (v == null) delete step.wait; else step.wait = v; onChange(); }, { step: 0.1 })),
        fieldRow("sfx（空で なし）", textInput(step.sfx || "", (v) => { if (v) step.sfx = v; else delete step.sfx; onChange(); }))
      ));
      container.appendChild(row);
    });
    const add = document.createElement("button");
    add.className = "wide"; add.textContent = "＋ コマを ふやす";
    add.onclick = () => { cutscene.steps.push(defaultStepData("say")); onChange(); rerender(); };
    container.appendChild(add);
  }

  // ---- タイプごとの 編集らん ----
  const NPC_PRESETS = [
    { value: "", label: "（キャラを えらぶ）" },
    { value: "gil", label: "👦 狩人見習いの ギル", name: "狩人見習いの ギル", sprite: "👦", size: 76, walkKey: "gil" },
    { value: "seera", label: "👧 情報屋の セーラ", name: "情報屋の セーラ", sprite: "👧", size: 76, walkKey: "seera" },
    { value: "hana", label: "👧 友達の ハナ", name: "ハナ", sprite: "👧", size: 76, walkKey: "hana" },
    { value: "sumire", label: "🧓 むらの スミレばあちゃん", name: "むらの スミレばあちゃん", sprite: "🧓", size: 76, walkKey: "sumire" },
    { value: "hou", label: "🦉 ふくろうの ホゥ", name: "ふくろうの ホゥ", sprite: "🦉", size: 68, walkKey: "hou" },
    { value: "belle", label: "🧚 妖精ベル", name: "ベル", sprite: "🧚", size: 68, walkKey: "belle" },
    { value: "mii", label: "🐱 相棒ねこ ミィ", name: "ミィ", sprite: "🐱", size: 68, walkKey: "mii" },
  ];

  function renderNpcFields(add, ev) {
    add(fieldRow("キャラ プリセット", selectInput("", NPC_PRESETS, (val) => {
      const p = NPC_PRESETS.find((x) => x.value === val);
      if (!p || !p.value) return;
      ev.name = p.name;
      ev.sprite = p.sprite;
      ev.size = p.size;
      ev.walkKey = p.walkKey;
      save();
      renderInspector();
    })));
    add(fieldRow("名前", textInput(ev.name || "", (v) => { ev.name = v; save(); })));
    add(row2(
      fieldRow("絵（sprite）", textInput(ev.sprite || "", (v) => { ev.sprite = v; save(); })),
      fieldRow("歩行画像（walkKey）", textInput(ev.walkKey || "", (v) => { if (v) ev.walkKey = v; else delete ev.walkKey; save(); }))
    ));
    add(row2(
      fieldRow("大きさ（size。空で 76）", optionalNumberInput(ev.size, (v) => { if (v == null) delete ev.size; else ev.size = v; save(); })),
      fieldRow("話しかける きょり（r。空で 30）", optionalNumberInput(ev.r, (v) => { if (v == null) delete ev.r; else ev.r = v; save(); }))
    ));
    add(row2(
      fieldRow("set（話すと 立つ フラグ）", textInput(ev.set || "", (v) => { if (v) ev.set = v; else delete ev.set; save(); })),
      fieldRow("if（この フラグの ときだけ）", textInput(ev.if || "", (v) => { if (v) ev.if = v; else delete ev.if; save(); }))
    ));
    add(fieldRow("ifNot（この フラグが ない ときだけ）", textInput(ev.ifNot || "", (v) => { if (v) ev.ifNot = v; else delete ev.ifNot; save(); })));

    const box = document.createElement("div");
    box.className = "box";
    const head = document.createElement("div");
    head.className = "box-head";
    head.appendChild(Object.assign(document.createElement("b"), { textContent: "せりふ" }));
    const toggle = document.createElement("button");
    toggle.className = "small";
    toggle.textContent = ev.variants ? "単純な せりふに もどす" : "段階分け(variants)に する";
    toggle.onclick = () => {
      if (ev.variants) { ev.lines = ev.variants[ev.variants.length - 1].lines.slice(); delete ev.variants; }
      else { ev.variants = [{ lines: (ev.lines || ["ここに セリフを 書く。"]).slice() }]; delete ev.lines; }
      save(); renderInspector();
    };
    head.appendChild(toggle);
    box.appendChild(head);
    if (ev.variants) variantsEditor(box, ev.variants, () => save());
    else box.appendChild(textareaLines(ev.lines, (arr) => { ev.lines = arr; save(); }));
    add(box);
  }

  const BEHAVIOR_OPTS = [
    { value: "dummy", label: "dummy（動かない・かかし）" },
    { value: "patrol", label: "patrol（うろうろ）" },
    { value: "chase", label: "chase（追いかける）" },
    { value: "shooter", label: "shooter（弾を うつ）" },
    { value: "charge", label: "charge（ためて 突進）" },
  ];

  const ENEMY_PRESETS = [
    { value: "", label: "（てきを えらぶ）" },
    { value: "cat", label: "😾 いたずらネコ（パトロール）", name: "いたずらネコ", sprite: "😾", size: 68, maxHp: 12, attack: 2, behavior: "patrol", walkKey: "enemy", speed: 40, patrolRange: 80 },
    { value: "chase_cat", label: "🙀 びっくりネコ（おいかける）", name: "びっくりネコ", sprite: "🙀", size: 68, maxHp: 14, attack: 2, behavior: "chase", walkKey: "enemy", speed: 52, sight: 220 },
    { value: "boar", label: "🐗 トツゲキ猪（ためて突進）", name: "トツゲキ猪", sprite: "🐗", size: 76, maxHp: 20, attack: 3, behavior: "charge", walkKey: "boar", speed: 60, sight: 260, windupSec: 1.4, aimRatio: 0.5, dashSec: 0.85, dashSpeed: 270, dizzySec: 1.8, restSec: 1.2 },
    { value: "mushroom", label: "🍄 キノコこぞう（お散歩）", name: "キノコこぞう", sprite: "🍄", size: 62, maxHp: 10, attack: 1, behavior: "patrol", walkKey: "mushroom", speed: 32, patrolRange: 60 },
    { value: "spider", label: "🕷️ シャドウスパイダー（糸弾シューター）", name: "シャドウスパイダー", sprite: "🕷️", size: 70, maxHp: 14, attack: 2, behavior: "shooter", walkKey: "spider", speed: 28, sight: 320, shootInterval: 2.2, bulletSpeed: 140, bulletDamage: 1 },
    { value: "bat", label: "🦇 ヤミコウモリ（すばやく追尾）", name: "ヤミコウモリ", sprite: "🦇", size: 62, maxHp: 8, attack: 2, behavior: "chase", walkKey: "bat", speed: 58, sight: 240 },
    { value: "kakashi", label: "🪵 かかし（れんしゅう台）", name: "かかし", sprite: "🪵", size: 80, maxHp: 999, attack: 0, behavior: "dummy", walkKey: "kakashi" },
  ];

  function renderEnemyFields(add, ev) {
    add(fieldRow("てき プリセット", selectInput("", ENEMY_PRESETS, (val) => {
      const p = ENEMY_PRESETS.find((x) => x.value === val);
      if (!p || !p.value) return;
      ev.name = p.name;
      ev.sprite = p.sprite;
      ev.size = p.size;
      ev.maxHp = p.maxHp;
      ev.attack = p.attack;
      ev.behavior = p.behavior;
      ev.walkKey = p.walkKey || p.value;
      if (p.speed) ev.speed = p.speed;
      if (p.patrolRange) ev.patrolRange = p.patrolRange;
      if (p.sight) ev.sight = p.sight;
      if (p.shootInterval) ev.shootInterval = p.shootInterval;
      if (p.bulletSpeed) ev.bulletSpeed = p.bulletSpeed;
      if (p.bulletDamage) ev.bulletDamage = p.bulletDamage;
      if (p.windupSec) ev.windupSec = p.windupSec;
      if (p.aimRatio != null) ev.aimRatio = p.aimRatio;
      if (p.dashSec) ev.dashSec = p.dashSec;
      if (p.dashSpeed) ev.dashSpeed = p.dashSpeed;
      if (p.dizzySec) ev.dizzySec = p.dizzySec;
      if (p.restSec) ev.restSec = p.restSec;
      save();
      renderInspector();
    })));
    add(fieldRow("名前", textInput(ev.name || "", (v) => { ev.name = v; save(); })));
    add(row2(
      fieldRow("絵（sprite）", textInput(ev.sprite || "", (v) => { ev.sprite = v; save(); })),
      fieldRow("歩行画像（walkKey）", textInput(ev.walkKey || "", (v) => { ev.walkKey = v; save(); }))
    ));
    add(row2(
      fieldRow("大きさ（size。通常: 68〜76、かかし: 80）", optionalNumberInput(ev.size, (v) => { if (v == null) delete ev.size; else ev.size = v; save(); })),
      fieldRow("HP", numberInput(ev.maxHp, (v) => { ev.maxHp = v; save(); }))
    ));
    add(row2(
      fieldRow("こうげき力", numberInput(ev.attack, (v) => { ev.attack = v; save(); })),
      fieldRow("うごきかた（behavior）", selectInput(ev.behavior, BEHAVIOR_OPTS, (v) => { ev.behavior = v; save(); renderInspector(); }))
    ));
    add(row2(
      checkLabel("たおすと おぼえる（remember）", ev.remember, (v) => { ev.remember = v; save(); }),
      checkLabel("絵を むきで かえる（walk）", ev.walk !== false, (v) => { ev.walk = v; save(); })
    ));
    const bh = ev.behavior;
    if (bh !== "dummy") {
      const r = row2(
        fieldRow("はやさ（speed）", numberInput(ev.speed || 40, (v) => { ev.speed = v; save(); })),
        bh === "patrol"
          ? fieldRow("うろうろ はんい（patrolRange）", numberInput(ev.patrolRange || 90, (v) => { ev.patrolRange = v; save(); }))
          : fieldRow("見える きょり（sight）", numberInput(ev.sight || 200, (v) => { ev.sight = v; save(); }))
      );
      add(r);
    }
    if (bh === "shooter") {
      add(row2(
        fieldRow("うつ 間かく秒（shootInterval）", numberInput(ev.shootInterval || 1.5, (v) => { ev.shootInterval = v; save(); }, { step: 0.1 })),
        fieldRow("弾の はやさ", numberInput(ev.bulletSpeed || 150, (v) => { ev.bulletSpeed = v; save(); }))
      ));
      add(fieldRow("弾の ダメージ", numberInput(ev.bulletDamage || 2, (v) => { ev.bulletDamage = v; save(); })));
    }
    if (bh === "charge") {
      add(row2(
        fieldRow("ためる 秒（windupSec）", numberInput(ev.windupSec || 1.2, (v) => { ev.windupSec = v; save(); }, { step: 0.1 })),
        fieldRow("ねらい わりあい（aimRatio）", numberInput(ev.aimRatio == null ? 0.5 : ev.aimRatio, (v) => { ev.aimRatio = v; save(); }, { step: 0.1 }))
      ));
      add(row2(
        fieldRow("走る 秒（dashSec）", numberInput(ev.dashSec || 0.8, (v) => { ev.dashSec = v; save(); }, { step: 0.05 })),
        fieldRow("走る はやさ（dashSpeed）", numberInput(ev.dashSpeed || 250, (v) => { ev.dashSpeed = v; save(); }))
      ));
      add(row2(
        fieldRow("目を まわす秒（dizzySec）", numberInput(ev.dizzySec || 1.5, (v) => { ev.dizzySec = v; save(); }, { step: 0.1 })),
        fieldRow("休む秒（restSec）", numberInput(ev.restSec || 1, (v) => { ev.restSec = v; save(); }, { step: 0.1 }))
      ));
    }
  }

  function renderChestFields(add, ev) {
    add(fieldRow("かぎ（key。あいことば）", textInput(ev.key || "", (v) => { ev.key = v; save(); })));
    add(fieldRow("アイテム名（item）", textInput(ev.item || "", (v) => { ev.item = v; save(); })));
    add(fieldRow("メッセージ", textareaSingle(ev.message, (v) => { ev.message = v; save(); })));
  }
  function renderCheckpointFields(add, ev) {
    add(fieldRow("はんい（r）", numberInput(ev.r || 70, (v) => { ev.r = v; save(); })));
  }
  function renderTriggerFields(add, ev) {
    add(fieldRow("はんい（r）", numberInput(ev.r || 70, (v) => { ev.r = v; save(); })));
    add(fieldRow("mutter（小さく でる ひとこと）", textInput(ev.mutter || "", (v) => { if (v) ev.mutter = v; else delete ev.mutter; save(); })));
    add(row2(
      fieldRow("praise（ほめる。任意）", textInput(ev.praise || "", (v) => { if (v) ev.praise = v; else delete ev.praise; save(); })),
      fieldRow("sfx（音。任意）", textInput(ev.sfx || "", (v) => { if (v) ev.sfx = v; else delete ev.sfx; save(); }))
    ));
    add(row2(
      fieldRow("set（通ると 立つ フラグ）", textInput(ev.set || "", (v) => { if (v) ev.set = v; else delete ev.set; save(); })),
      fieldRow("ifNot（この フラグが ない ときだけ）", textInput(ev.ifNot || "", (v) => { if (v) ev.ifNot = v; else delete ev.ifNot; save(); }))
    ));
    add(fieldRow("if（この フラグの ときだけ）", textInput(ev.if || "", (v) => { if (v) ev.if = v; else delete ev.if; save(); })));

    const box = document.createElement("div");
    box.className = "box";
    const head = document.createElement("div");
    head.className = "box-head";
    head.appendChild(Object.assign(document.createElement("b"), { textContent: "カットシーン" }));
    const toggle = document.createElement("button");
    toggle.className = "small";
    toggle.textContent = ev.cutscene ? "カットシーンを けす" : "カットシーンを つける";
    toggle.onclick = () => {
      if (ev.cutscene) { if (!confirm("カットシーンを けしますか？")) return; delete ev.cutscene; }
      else ev.cutscene = { steps: [] };
      save(); renderInspector();
    };
    head.appendChild(toggle);
    box.appendChild(head);
    if (ev.cutscene) cutsceneEditor(box, ev.cutscene, () => save(), renderInspector);
    add(box);
  }
  function renderGateFields(add, ev) {
    add(fieldRow("はんい（r）", numberInput(ev.r || 44, (v) => { ev.r = v; save(); })));
    add(fieldRow("ひつような かぎ（requireKey）", textInput(ev.requireKey || "", (v) => { ev.requireKey = v; save(); })));
    add(row2(
      fieldRow("ひつような かず（requireCount）", numberInput(ev.requireCount || 1, (v) => { ev.requireCount = v; save(); })),
      fieldRow("HUDの 絵（hudIcon）", textInput(ev.hudIcon || "🔑", (v) => { ev.hudIcon = v; save(); }))
    ));
    add(fieldRow("とじている ときの セリフ", textareaLines(ev.lockedLines, (arr) => { ev.lockedLines = arr; save(); })));
    add(fieldRow("ひらいた ときの セリフ", textareaLines(ev.openLines, (arr) => { ev.openLines = arr; save(); })));

    const box = document.createElement("div");
    box.className = "box";
    box.appendChild(Object.assign(document.createElement("b"), { textContent: "かべ（とじて いる あいだ ふさぐ）" }));
    box.appendChild(row2(
      fieldRow("はばの はんぶん", numberInput(ev.wallSpan || 88, (v) => { ev.wallSpan = v; regenerateGateWall(ev); save(); })),
      fieldRow("かんかく", numberInput(ev.wallGap || 18, (v) => { ev.wallGap = v; regenerateGateWall(ev); save(); }))
    ));
    box.appendChild(row2(
      fieldRow("1つの 大きさ", numberInput(ev.wallR || 24, (v) => { ev.wallR = v; regenerateGateWall(ev); save(); })),
      fieldRow("絵", textInput(ev.wallSprite || "🧱", (v) => { ev.wallSprite = v; regenerateGateWall(ev); save(); }))
    ));
    add(box);
  }
  function renderExitFields(add, ev) {
    add(fieldRow("はんい（r）", numberInput(ev.r || 50, (v) => { ev.r = v; save(); })));
    add(checkLabel("ボスが 必要（requireBoss）", ev.requireBoss, (v) => { ev.requireBoss = v; save(); }));
    add(fieldRow("ラベル", textInput(ev.label || "", (v) => { ev.label = v; save(); })));
    add(fieldRow("セリフ", textareaLines(ev.lines, (arr) => { ev.lines = arr; save(); })));
  }
  function renderStartFields(add, ev) {
    add(fieldRow("名前", textInput(ev.name || "リイコ", (v) => { ev.name = v; save(); })));
    add(fieldRow("絵（sprite）", textInput(ev.sprite || "👧", (v) => { ev.sprite = v; save(); })));
    add(row2(
      fieldRow("大きさ（size）", numberInput(ev.size || 68, (v) => { ev.size = v; save(); })),
      fieldRow("ハート（maxHp）", numberInput(ev.maxHp || 3, (v) => { ev.maxHp = v; save(); }))
    ));
    add(fieldRow("こうげき力（attack）", numberInput(ev.attack || 5, (v) => { ev.attack = v; save(); })));
  }

  function renderInspector() {
    if (!S.selected) return;
    const { kind, index } = S.selected;
    const ev = getEvent(kind, index);
    if (!ev) { closeInspector(); return; }
    const def = eventDef(kind);
    $("insp-title").textContent = def.ic + " " + def.label + (ev.name ? "：" + ev.name : ev.id ? "：" + ev.id : "");
    const body = $("insp-body");
    body.innerHTML = "";
    const add = (el) => body.appendChild(el);

    add(row2(
      fieldRow("x", numberInput(ev.x, (v) => { ev.x = v; if (kind === "gate") regenerateGateWall(ev); save(); })),
      fieldRow("y", numberInput(ev.y, (v) => { ev.y = v; if (kind === "gate") regenerateGateWall(ev); save(); }))
    ));

    if (kind === "npc") renderNpcFields(add, ev);
    else if (kind === "enemy") renderEnemyFields(add, ev);
    else if (kind === "chest") renderChestFields(add, ev);
    else if (kind === "checkpoint") renderCheckpointFields(add, ev);
    else if (kind === "trigger") renderTriggerFields(add, ev);
    else if (kind === "gate") renderGateFields(add, ev);
    else if (kind === "exit") renderExitFields(add, ev);
    else if (kind === "start") renderStartFields(add, ev);
  }

  // =========================================================
  //  ヒント リスト（ひだり バー。うえから じゅんに 出る）
  // =========================================================
  function renderHintList() {
    const list = $("hint-list");
    if (!list) return;
    list.innerHTML = "";
    (S.data.hints || []).forEach((h, i) => {
      h.point = h.point || { x: Math.round(S.data.world.width / 2), y: Math.round(S.data.world.height / 2) };
      const row = document.createElement("div");
      row.className = "hint-row";
      const head = document.createElement("div");
      head.style.display = "flex"; head.style.justifyContent = "space-between"; head.style.alignItems = "center";
      head.appendChild(Object.assign(document.createElement("b"), { textContent: (i + 1) + "ばんめ" }));
      row.appendChild(head);
      row.appendChild(row2(
        fieldRow("ifNot", textInput(h.ifNot || "", (v) => { if (v) h.ifNot = v; else delete h.ifNot; save(); })),
        fieldRow("if", textInput(h.if || "", (v) => { if (v) h.if = v; else delete h.if; save(); }))
      ));
      row.appendChild(textareaLines(h.lines, (arr) => { h.lines = arr; save(); }));
      row.appendChild(row2(
        fieldRow("行き先 x", numberInput(h.point.x, (v) => { h.point.x = v; save(); })),
        fieldRow("行き先 y", numberInput(h.point.y, (v) => { h.point.y = v; save(); }))
      ));
      const btns = document.createElement("div");
      btns.className = "hint-btns";
      if (i > 0) {
        const up = document.createElement("button");
        up.className = "small"; up.textContent = "↑";
        up.onclick = () => { const t = S.data.hints[i - 1]; S.data.hints[i - 1] = S.data.hints[i]; S.data.hints[i] = t; save(); renderHintList(); };
        btns.appendChild(up);
      }
      if (i < S.data.hints.length - 1) {
        const dn = document.createElement("button");
        dn.className = "small"; dn.textContent = "↓";
        dn.onclick = () => { const t = S.data.hints[i + 1]; S.data.hints[i + 1] = S.data.hints[i]; S.data.hints[i] = t; save(); renderHintList(); };
        btns.appendChild(dn);
      }
      const del = document.createElement("button");
      del.className = "small"; del.textContent = "🗑";
      del.onclick = () => { if (!confirm("この ヒントを けしますか？")) return; S.data.hints.splice(i, 1); save(); renderHintList(); };
      btns.appendChild(del);
      row.appendChild(btns);
      list.appendChild(row);
    });
  }

  // =========================================================
  //  オープニング（intro）の へんしゅう ―― モーダルで
  // =========================================================
  function openIntroModal() {
    S.data.intro = S.data.intro || { once: "prologueDone", cutscene: { steps: [] } };
    richModal("🎬 オープニング（面の さいしょに 1回だけ）", (c) => {
      // テンプレート自動作成ボタン
      const presetBtn = document.createElement("button");
      presetBtn.className = "wide primary";
      presetBtn.style.marginBottom = "10px";
      presetBtn.textContent = "✨ 友達（ハナ）がさらわれるオープニングを自動作成";
      presetBtn.onclick = () => {
        const px = S.data.player ? S.data.player.x : 514;
        const py = S.data.player ? S.data.player.y : 1852;
        if (M.createPrologueCutscene) {
          S.data.intro = M.createPrologueCutscene(px, py);
          save();
          openIntroModal();
        }
      };
      c.appendChild(presetBtn);

      c.appendChild(fieldRow("once（この フラグが 立ったら 二度と 出さない）",
        textInput(S.data.intro.once || "", (v) => { S.data.intro.once = v; save(); })));
      const box = document.createElement("div");
      box.className = "box";
      S.data.intro.cutscene = S.data.intro.cutscene || { steps: [] };
      cutsceneEditor(box, S.data.intro.cutscene, () => save(), openIntroModal);
      c.appendChild(box);
      const clearBtn = document.createElement("button");
      clearBtn.className = "wide danger";
      clearBtn.textContent = "オープニングを なくす";
      clearBtn.onclick = () => {
        if (!confirm("オープニングを 消しますか？")) return;
        S.data.intro = null;
        save();
        $("modal").classList.add("hidden");
      };
      c.appendChild(clearBtn);
    });
  }

  // =========================================================
  //  イベントの ぶひんを ぜんぶ 作りなおす（マップを よみこんだ とき など）
  //    イベント モードで ない ときは、見えて いないので なにも しない
  //    （テストの かんたんな DOM でも うごく ように）。
  // =========================================================
  function renderEventPanels() {
    if (S.mode !== "events") return;
    renderHintList();
    if (S.selected) renderInspector();
  }

  // =========================================================
  //  モード きりかえ（地形 ⇔ イベント）
  // =========================================================
  function setMode(mode) {
    S.mode = mode;
    document.querySelectorAll("#modebar button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
    $("terrain-sections").classList.toggle("hidden", mode !== "terrain");
    $("sec-events").classList.toggle("hidden", mode !== "events");
    $("sec-hints").classList.toggle("hidden", mode !== "events");
    $("sec-intro").classList.toggle("hidden", mode !== "events");
    if (mode !== "events") closeInspector();
    else renderHintList();
    if (S.walk) toggleWalk();
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
      if (Math.abs(kx) > Math.abs(ky)) {
        w.dir = kx > 0 ? "right" : "left";
      } else {
        w.dir = ky > 0 ? "down" : "up";
      }
      w.animT = (w.animT || 0) + dt;
      if (w.animT > 0.18) {
        w.animT = 0;
        w.frame = (w.frame || 0) === 0 ? 1 : 0;
      }
    } else {
      w.frame = 0;
    }

    // しょうがいぶつから おし出す（ゲームと おなじ 足元・根元シフト判定）
    const R = 18;
    const footOffset = 68 * 0.28; // ~19px
    let fx = w.x;
    let fy = w.y + footOffset;

    const push = (o) => {
      const ox = o.x;
      const oy = o.y + (o.r ? o.r * 0.2 : 0);
      const or = o.r;
      const min = or + R;
      const dx = fx - ox,
        dy = fy - oy;
      const d = Math.hypot(dx, dy);
      if (d < min) {
        if (d < 0.001) {
          fx = ox + min;
        } else {
          fx = ox + (dx / d) * min;
          fy = oy + (dy / d) * min;
        }
      }
    };
    for (const o of S.fillCache) push(o);
    for (const o of S.data.objects) push(o);
    w.x = fx;
    w.y = fy - footOffset;

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
    const w = S.walk;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + 20, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawn = drawWalkSprite(window.WALKS && window.WALKS.player, w.dir || "down", w.frame || 0, w.x, w.y, 68);
    if (!drawn) {
      sprite("👧", w.x, w.y, 42);
    }
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
    fillEventDefaults(d);
    setData(d);
  }

  // めじるしから scenario.js に はりつける コードを 作る
  // 「🎬 イベント」で 作った データは js/maps/◯◯.js に そのまま はいるので、
  // ここでは js/stages/◯◯.js に おく「うすい ラッパー」の ひな形だけ 出す。
  function scenarioCode() {
    const d = S.data;
    const L = [];
    L.push("// ---- index.html に この1ぎょうを ふやす ----");
    L.push('// <script src="js/maps/' + d.name + '.js"><\\/script>');
    L.push('// <script src="js/stages/' + d.name + '.js"><\\/script>');
    L.push("");
    L.push("// ---- js/stages/" + d.name + ".js（あたらしい ファイル）----");
    L.push("(function () {");
    L.push('  const MAP = MapData.build(window.MAPS["' + d.name + '"]);');
    L.push("  const PLAYER_WALK = window.WALKS.player;");
    L.push("  const ENEMY_WALK = window.WALKS.enemy;");
    L.push("");
    L.push('  window.STAGES["' + d.name + '"] = {');
    L.push('    title: "' + (d.title || d.name) + '",');
    L.push("    next: null, // つぎの 面の なまえ（さいごの 面なら null）");
    L.push("    intro: MAP.intro,");
    L.push("    world: MAP.world,");
    L.push("    obstacles: MAP.obstacles,");
    L.push("    decorations: MAP.decorations,");
    L.push("    player: { ...MAP.player, walk: PLAYER_WALK },");
    L.push("    partner: null, // 仲間ねこが いる 面だけ { sprite: \"🐱\", name: \"ミィ\", maxHp: 30, attack: 4 }");
    L.push("    enemies: MAP.enemies.map((e) => { const { walk, ...rest } = e; return walk ? { ...rest, walk: ENEMY_WALK } : rest; }),");
    L.push("    npcs: MAP.npcs,");
    L.push("    chests: MAP.chests,");
    L.push("    checkpoints: MAP.checkpoints,");
    L.push("    triggers: MAP.triggers,");
    L.push("    gates: MAP.gates,");
    L.push("    exit: MAP.exit,");
    L.push("    hints: MAP.hints,");
    L.push("  };");
    L.push("})();");
    return L.join("\n");
  }

  // =========================================================
  //  まど
  // =========================================================
  function modal(title, bodyHTML, text) {
    $("modal-title").textContent = title;
    $("modal-body").innerHTML = bodyHTML || "";
    $("modal-rich").classList.add("hidden");
    $("modal-rich").innerHTML = "";
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
  // すうじ入れなどを その まま おける まど（イベント作成 むけ）
  function richModal(title, buildFn) {
    $("modal-title").textContent = title;
    $("modal-body").innerHTML = "";
    $("modal-text").classList.add("hidden");
    $("modal-copy").classList.add("hidden");
    const rich = $("modal-rich");
    rich.innerHTML = "";
    rich.classList.remove("hidden");
    buildFn(rich);
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
  const MODES = [
    { id: "terrain", ic: "🗺️", label: "地形" },
    { id: "events", ic: "🎬", label: "イベント" },
  ];
  function buildUI() {
    const modebar = $("modebar");
    MODES.forEach((m) => {
      const b = document.createElement("button");
      b.innerHTML = '<span class="ic">' + m.ic + "</span>" + m.label;
      b.dataset.mode = m.id;
      b.classList.toggle("on", m.id === "terrain");
      b.onclick = () => setMode(m.id);
      modebar.appendChild(b);
    });

    const evTools = $("ev-tools");
    EVENT_TYPES.forEach((t) => {
      const b = document.createElement("button");
      b.innerHTML = '<span class="ic">' + t.ic + "</span>" + t.label;
      b.dataset.evtool = t.kind;
      b.onclick = () => { S.evTool = t.kind; markTools(); };
      evTools.appendChild(b);
    });

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
    document.querySelectorAll("#ev-tools button").forEach((b) => b.classList.toggle("on", b.dataset.evtool === S.evTool));
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

  // ディスクの最新マップファイルを直接取得して反映する（ブラウザキャッシュ対策）
  async function loadStageFile(stageName) {
    let mapData = null;
    try {
      const res = await fetch("../js/maps/" + stageName + ".js?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/\/\*MAPDATA\*\/(.*?)(?:\/\*ENDMAPDATA\*\/|;?\s*$)/s);
        if (m && m[1]) {
          mapData = JSON.parse(m[1].trim().replace(/;$/, ""));
          window.MAPS = window.MAPS || {};
          window.MAPS[stageName] = mapData;
        }
      }
    } catch (e) {
      console.warn("fetch loadStageFile fallback:", e);
    }
    if (!mapData && window.MAPS && window.MAPS[stageName]) {
      mapData = JSON.parse(JSON.stringify(window.MAPS[stageName]));
    }
    return mapData;
  }

  // ---- そうさの ひもづけ ----
  function bind() {
    $("insp-close").onclick = closeInspector;
    $("insp-delete").onclick = () => {
      if (!S.selected) return;
      if (!confirm("この イベントを けしますか？")) return;
      snapshot();
      const { kind, index } = S.selected;
      if (kind === "start") S.data.player = null;
      else if (kind === "exit") S.data.exit = null;
      else evList(kind).splice(index, 1);
      closeInspector();
      save();
    };
    $("b-hint-add").onclick = () => {
      snapshot();
      S.data.hints.push({ lines: [""], point: { x: Math.round(S.data.world.width / 2), y: Math.round(S.data.world.height / 2) } });
      save();
      renderHintList();
    };
    $("b-intro-edit").onclick = openIntroModal;

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
      save();
      const name = S.data.name + ".js";
      download(exportJS(), name);
      modal(
        "💾 ファイルに だしました",
        "<b>" + name + "</b> を ダウンロードしました。<br><br>" +
          "<b style='color:#f87171;'>⚠️ 保存先フォルダのご注意:</b><br>" +
          "プロジェクトのファイルを置き換える場合は、必ず <b><code>js/maps/" + name + "</code></b> に保存してください。<br>" +
          "<span style='color:#f87171;'>※ <code>js/stages/</code> フォルダには保存しないでください（シナリオ用ファイルのためゲームが動かなくなります）。</span><br><br>" +
          "<b>💡 自動連携について:</b><br>" +
          "同じブラウザでゲーム（<code>index.html</code>）を開く場合は、<b>ファイルを移動しなくても自動で最新マップが反映されます！</b>"
      );
    };

    let fsFileHandle = null;
    const fsSaveBtn = $("b-fs-save");
    if (fsSaveBtn) {
      if (!window.showSaveFilePicker) {
        fsSaveBtn.style.display = "none";
      } else {
        fsSaveBtn.onclick = async () => {
          try {
            if (!fsFileHandle) {
              fsFileHandle = await window.showSaveFilePicker({
                suggestedName: S.data.name + ".js",
                types: [{
                  description: "マップデータ（保存先: js/maps/" + S.data.name + ".js）",
                  accept: { "text/javascript": [".js"] },
                }],
              });
            }
            const writable = await fsFileHandle.createWritable();
            await writable.write(exportJS());
            await writable.close();
            updateSyncIndicator("💾 ファイル保存完了", true);
            modal(
              "💾 ファイルに直接保存しました",
              "<b>" + (fsFileHandle.name || (S.data.name + ".js")) + "</b> に保存しました！<br><br>" +
              "<b style='color:#f87171;'>⚠️ ご確認:</b><br>" +
              "保存先が <b><code>js/maps/</code></b> フォルダであることをご確認ください。<br>" +
              "（※ <code>js/stages/</code> ではありません）<br><br>" +
              "ゲーム画面（<code>index.html</code>）を再読み込み（F5）すると反映されます。"
            );
          } catch (err) {
            if (err.name !== "AbortError") {
              console.error(err);
              modal("保存エラー", "ファイルに保存できませんでした: " + err.message);
            }
          }
        };
      }
    }

    const copyMapBtn = $("b-copy-map");
    if (copyMapBtn) {
      copyMapBtn.onclick = () => {
        const code = exportJS();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
        modal(
          "📋 マップコードを コピーしました",
          "クリップボードに コピーしました！<br>" +
            "<code>js/maps/" + S.data.name + ".js</code> を エディタで ひらいて、ぜんぶ 貼り付けるだけで ゲームに すぐ 反映されます！",
          code
        );
      };
    }

    $("b-code").onclick = () => {
      modal(
        "📋 あたらしい 面の コード",
        "てき・NPC・セリフなどは もう <code>💾 ファイルに だす</code> に ぜんぶ 入って います。" +
          "これは あたらしい 面を 作った ときに、<code>js/stages/◯◯.js</code> として おく「うすい ラッパー」の ひな形です。",
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
        if (!k) return;
        if (!confirm("「" + k + "」を よみこみます。いまの さぎょうは きえます。いい？")) return;
        if (window.MAPS && window.MAPS[k]) {
          setData(JSON.parse(JSON.stringify(window.MAPS[k])));
          save();
        }
        if (isBrowser && typeof loadStageFile === "function") {
          loadStageFile(k).then((loaded) => {
            if (loaded && loaded.world) {
              setData(loaded);
              save();
            }
          }).catch(() => {});
        }
      };

      const reloadBtn = $("b-reload-file");
      if (reloadBtn) {
        reloadBtn.onclick = async () => {
          const k = (sel && sel.value) || S.data.name || "stage1";
          if (!confirm("本番マップ（js/maps/" + k + ".js）を読み直します。編集中の作業はリセットされます。よろしいですか？")) return;
          let loaded = null;
          if (typeof loadStageFile === "function") {
            try { loaded = await loadStageFile(k); } catch (e) {}
          }
          if (!loaded && window.MAPS && window.MAPS[k]) {
            loaded = JSON.parse(JSON.stringify(window.MAPS[k]));
          }
          if (!loaded) {
            modal("エラー", "「" + k + "」の本番マップを読み込めませんでした。");
            return;
          }
          loaded.updatedAt = Date.now();
          setData(loaded);
          save();
          modal("本番マップ反映", "「" + k + "」の本番マップ（js/maps/" + k + ".js）を読み込みました！");
        };
      }
    }

    window.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const k = e.key.toLowerCase();
      if (S.walk) S.walk.keys[k] = true;
      if (e.code === "Space" || k === " ") {
        e.preventDefault();
        if (!S.space_) {
          S.space_ = true;
          canvas.style.cursor = S.drag && S.drag.tool === "pan" ? "grabbing" : "grab";
        }
      }
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
      if (e.code === "Space" || k === " ") {
        S.space_ = false;
        if (!S.drag || S.drag.tool !== "pan") {
          canvas.style.cursor = "";
        }
      }
    });
    window.addEventListener("blur", () => {
      S.space_ = false;
      if (!S.drag || S.drag.tool !== "pan") {
        canvas.style.cursor = "";
      }
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
        "<b>6. 🎬 イベント（てき・NPC・トリガー・ヒント・オープニング）</b><br>" +
        "ひだり うえの「モード」で「🎬 イベント」に すると、地形の うえに" +
        "てき・NPC・宝箱・チェックポイント・トリガー・とびら・出口・スタート地点を おけます。<br>" +
        "クリックで あたらしく おき、すでに ある ものを クリックすると 右に 編集パネルが 出ます" +
        "（そのまま ドラッグで うごかせます）。せりふの 段階分け（variants）や カットシーンも" +
        "この パネルで 作れます。ヒントは ひだりの リストで、オープニングは「オープニングを 編集」で 作ります。<br><br>" +
        "<b>7. ほぞん</b><br>" +
        "「ファイルに だす」→ <code>js/maps/</code> に いれる（地形も イベントも これ 1つに 入ります）。<br>" +
        "あたらしい 面を 作った ときだけ「📋 あたらしい 面の コード」で <code>js/stages/◯◯.js</code> の ひな形を 出します。<br><br>" +
        "そのほか：マウスホイールで 拡大縮小／<b>スペースキーを押しながらドラッグ</b>（またはマウスホイールボタン/右ボタン）で画面を動かす／Ctrl+Z で もどす。" +
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

  // 起動時のマップ読み込み：
  // ブラウザ環境（開いたタイミング）では、常に本番マップ（js/maps/◯◯.js）を最新として読み込む。
  // （古い localStorage の下書きが原因で「一番昔のマップ」が開いてしまう問題を防止）
  const isBrowser = typeof location !== "undefined" && Boolean(location.href || location.search !== undefined);
  let start = null;

  if (isBrowser) {
    const queryStage = location.search
      ? (new URLSearchParams(location.search).get("stage") || "stage1")
      : "stage1";
    const stageToLoad = (window.MAPS && window.MAPS[queryStage]) ? queryStage : "stage1";
    if (window.MAPS && window.MAPS[stageToLoad]) {
      start = JSON.parse(JSON.stringify(window.MAPS[stageToLoad]));
    }
  } else {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) start = JSON.parse(raw);
    } catch (e) {
      start = null;
    }
  }

  S.data = fillEventDefaults(start && start.world ? start : newData());
  S.data.updatedAt = Date.now();
  S.excludeSet = new Set(S.data.fill.exclude || []);

  const selStage = $("f-maps");
  if (selStage) selStage.value = S.data.name || "stage1";

  rebuildFill();
  syncForm();
  renderEventPanels();
  resize();
  fitView();
  requestAnimationFrame(loop);

  if (isBrowser) {
    // 初回起動時も本番マップのデータを localStorage に同期
    try {
      const jsonStr = JSON.stringify(S.data);
      localStorage.setItem(SAVE_KEY, jsonStr);
      localStorage.setItem("riiko.map." + String(S.data.name).toLowerCase(), jsonStr);
      localStorage.setItem("riiko.map.last_updated", String(Date.now()));
    } catch (e) {}

    // さらにバックグラウンドで最新ファイルを fetch してディスク上の最新内容があれば即時更新
    (async () => {
      try {
        const stageName = S.data.name || "stage1";
        const fresh = await loadStageFile(stageName);
        if (fresh && fresh.world) {
          setData(fresh);
        }
      } catch (e) {}
    })();
  }
})();
