/*
 * =========================================================
 *  マップのデータ形式（ゲームと マップ作成ツールで きょうよう）
 * =========================================================
 *  「歩けるところ（じめん）」を いくつか おいて、
 *  それ いがい を 木や かべ で うめる ―― という 考えかた。
 *
 *  データの かたち:
 *  {
 *    name: "stage2",              // ファイルの なまえ
 *    title: "ボスのしろ",
 *    world: { width, height, ground },        // ひろさ と そとがわの 色
 *    areas: [                                  // 歩ける じめん
 *      { shape:"rect",   x, y, w, h, kind:"grass" },
 *      { shape:"circle", x, y, r,    kind:"stone" },
 *    ],
 *    fill: { on, sprite, r, gap, jitter, margin, exclude },  // そとがわを うめる（森・かべ）
 *    objects:     [ { x, y, r, sprite } ],     // 手でおいた しょうがいぶつ
 *    decorations: [ { x, y, sprite } ],        // かざり（ぶつからない）
 *
 *  sprite は 絵の 名まえ（"tree" など。js/assets-data.js の 一らん）。
 *  むかしの マップの 絵文字（"🌳"）も そのまま つかえる。
 *    markers:     [ { x, y, type } ],          // めじるし（ゲームでは つかわない メモ）
 *  }
 * =========================================================
 */
(function () {
  "use strict";

  // ---- じめんの しゅるい（色）----
  const GROUND_KINDS = {
    grass:  { label: "くさ",             color: "#8fca7a" },
    grass2: { label: "ふかい くさ",       color: "#79b768" },
    dirt:   { label: "つち の みち",      color: "#c9a878" },
    sand:   { label: "すな",             color: "#e7d7a4" },
    stone:  { label: "いし の ゆか",      color: "#b9b7bf" },
    stone2: { label: "くらい いし",       color: "#8d8a96" },
    wood:   { label: "いた の ゆか",      color: "#c08a52" },
    carpet: { label: "あかい じゅうたん", color: "#b4535a" },
    snow:   { label: "ゆき",             color: "#e9f1f7" },
    lava:   { label: "あつい ゆか",       color: "#d5763f" },
  };

  // ---- しょうがいぶつ パーツ（ぶつかる）----
  //   中みは js/assets-data.js（tools/build-assets.py が つくる 絵の 一らん）。
  //   絵が ない ときの ため、さいごに 絵文字の パーツも すこし たしておく。
  const ASSETS = (typeof window !== "undefined" && window.PartAssets) || { list: [] };

  const PARTS = ASSETS.list
    .filter((a) => a.r > 0)
    .map((a) => ({ sprite: a.id, label: a.label, r: a.r, group: a.group }));

  const EXTRA_PARTS = [
    { sprite: "🌴", label: "やしのき", r: 26, group: "emoji" },
    { sprite: "🌵", label: "サボテン", r: 20, group: "emoji" },
    { sprite: "🗼", label: "とう",     r: 30, group: "emoji" },
    { sprite: "❄️", label: "こおり",   r: 22, group: "emoji" },
    { sprite: "🔥", label: "ほのお",   r: 18, group: "emoji" },
    { sprite: "🕯️", label: "ろうそく", r: 12, group: "emoji" },
  ];
  for (const p of EXTRA_PARTS) PARTS.push(p);

  // ---- かざり（ぶつからない）----
  const DECOS = ASSETS.list
    .filter((a) => a.r === 0)
    .map((a) => a.id)
    .concat(["🌼", "🌸", "🌷", "🌻", "🍄", "🍁", "🪻", "💧", "🦋", "🐞", "⭐", "🕸️", "🦴"]);

  // パーツの まとまりの 名まえ（マップ作成ツールの 見出しに つかう）
  const PART_GROUPS = Object.assign({}, ASSETS.groups, { emoji: "絵文字" });

  // まわりを うめる パーツ（森の かべ など）に えらべる もの
  const FILL_PARTS = ["tree", "tree2", "tree-big", "fir", "fir-big", "fir-tall",
                      "bush-berry", "rocks", "rock-d", "rock-big", "cliff-wall", "fence", "🌴", "❄️"];

  // ---- めじるし（ゲームでは つかわない。scenario.js に 書きうつす ための メモ）----
  const MARKERS = [
    { type: "start", sprite: "👧", label: "スタート" },
    { type: "enemy", sprite: "😾", label: "てき" },
    { type: "boss",  sprite: "😼", label: "ボス" },
    { type: "chest", sprite: "🎁", label: "たからばこ" },
    { type: "npc",   sprite: "🧙", label: "じゅうにん" },
    { type: "gate",  sprite: "🚪", label: "とびら" },
    { type: "exit",  sprite: "⛩️", label: "でぐち" },
  ];

  // ---- ひとつの じめんの中に いるか ----
  function inArea(a, x, y, margin) {
    const m = margin || 0;
    if (a.shape === "circle") return Math.hypot(x - a.x, y - a.y) < a.r + m;
    return x > a.x - m && x < a.x + a.w + m && y > a.y - m && y < a.y + a.h + m;
  }

  // ---- 歩けるところ か どうか ----
  function inWalk(data, x, y, margin) {
    const areas = data.areas || [];
    for (let i = 0; i < areas.length; i++) if (inArea(areas[i], x, y, margin)) return true;
    return false;
  }

  // 消した うめパーツ の おぼえかた（ざひょうを 丸めた もじ）
  function excludeKey(x, y) {
    return Math.round(x) + "," + Math.round(y);
  }

  // ---- そとがわを 木（かべ）で うめる ----
  //   ならびが きかいてきに ならないよう、少しだけ ずらして おく。
  //   おなじ しきなので、ツールで 見たものと ゲームの中身は かならず 同じになる。
  function buildFill(data) {
    const f = data.fill;
    if (!f || !f.on) return [];
    const gap = f.gap || 58;
    const r = f.r || 26;
    const jit = f.jitter == null ? 14 : f.jitter;
    const margin = f.margin == null ? 24 : f.margin;
    const sprite = f.sprite || "tree";
    const mod = jit * 2 + 1;
    const ex = new Set(f.exclude || []);
    const out = [];
    for (let x = 20; x < data.world.width; x += gap) {
      for (let y = 20; y < data.world.height; y += gap) {
        const jx = jit ? ((x * 73 + y * 151) % mod) - jit : 0;
        const jy = jit ? ((x * 151 + y * 73) % mod) - jit : 0;
        const tx = x + jx,
          ty = y + jy;
        if (inWalk(data, tx, ty, margin)) continue;
        if (ex.size && ex.has(excludeKey(tx, ty))) continue;
        out.push({ x: tx, y: ty, r: r, sprite: sprite, fill: true });
      }
    }
    // 下（手まえ）に ある ものほど あとで かく。木が しぜんに かさなる。
    out.sort((a, b) => a.y - b.y);
    return out;
  }

  // ---- ゲームで つかう かたちに 組み立てる ----
  function build(data) {
    const areas = (data.areas || []).map((a) => ({
      ...a,
      color: (GROUND_KINDS[a.kind] || {}).color || a.color || "#8fca7a",
    }));
    return {
      world: {
        width: data.world.width,
        height: data.world.height,
        ground: data.world.ground || "#6e9d5c",
        areas: areas,
      },
      obstacles: buildFill(data)
        .concat((data.objects || []).map((o) => ({ ...o })))
        .sort((a, b) => a.y - b.y), // 手まえの ものが 上に かさなる
      decorations: (data.decorations || []).map((d) => ({ ...d })),
      markers: (data.markers || []).map((m) => ({ ...m })),
    };
  }

  window.MapData = {
    GROUND_KINDS,
    PARTS,
    PART_GROUPS,
    FILL_PARTS,
    DECOS,
    MARKERS,
    inArea,
    inWalk,
    buildFill,
    build,
    excludeKey,
  };
})();
