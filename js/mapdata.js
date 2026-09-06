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
    water:  { label: "みず・かわ",        color: "#4da6ff" },
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
                      "bush-berry", "rocks", "rock-d", "rock-big", "cliff-wall", "waterfall", "fence", "🌴", "❄️"];

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

  // 疑似乱数ハッシュ（同じ座標なら常に同じ値を返す）
  function fillHash(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  // ---- そとがわを 木（かべ）で うめる ----
  //   整列感をなくし、千鳥格子（ヘックス）＋極座標ハッシュゆらぎで自然な森に配置する。
  //   同じ式なので、ツールで見たものとゲームの中身は必ず同じになる。
  function buildFill(data) {
    const f = data.fill;
    if (!f || !f.on) return [];
    const gap = f.gap || 58;
    const r = f.r || 26;
    const margin = f.margin == null ? 24 : f.margin;
    const baseSprite = f.sprite || "tree";
    const ex = new Set(f.exclude || []);
    const out = [];

    // 千鳥格子（ヘックス）配置: 行ステップは gap * sqrt(3)/2 ≈ gap * 0.866
    const rowStep = gap * 0.866;
    let rowIndex = 0;

    for (let gy = 20; gy < data.world.height + gap * 0.5; gy += rowStep) {
      // 奇数行は半ピッチ横にずらす（千鳥）
      const rowOffset = (rowIndex % 2 === 1) ? gap * 0.5 : 0;
      for (let gx = 20 + rowOffset; gx < data.world.width + gap * 0.5; gx += gap) {
        // ハッシュから角度と距離をランダムに決定
        const h1 = fillHash(gx, gy);
        const h2 = fillHash(gx + 37.1, gy + 91.3);
        const angle = h1 * Math.PI * 2;
        // 最大振幅 gap * 0.35 のゆらぎ
        const dist = Math.sqrt(h2) * (gap * 0.35);

        const tx = Math.round(gx + Math.cos(angle) * dist);
        const ty = Math.round(gy + Math.sin(angle) * dist);

        if (tx < -gap || tx > data.world.width + gap || ty < -gap || ty > data.world.height + gap) continue;
        if (inWalk(data, tx, ty, margin)) continue;
        if (ex.size && ex.has(excludeKey(tx, ty))) continue;

        // treeの場合は自然なバリエーション（tree, tree2, tree-small）を軽く散らす
        let sprite = baseSprite;
        if (baseSprite === "tree") {
          const h3 = fillHash(gx + 17.5, gy + 43.7);
          if (h3 < 0.12) {
            sprite = "tree2";
          } else if (h3 < 0.20) {
            sprite = "tree-small";
          }
        }

        out.push({ x: tx, y: ty, r: r, sprite: sprite, fill: true });
      }
      rowIndex++;
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
        .concat((data.obstacles || []).map((o) => ({ ...o })))
        .sort((a, b) => a.y - b.y), // 手まえの ものが 上に かさなる
      decorations: (data.decorations || []).map((d) => ({ ...d })),
      markers: (data.markers || []).map((m) => ({ ...m })),

      // ---- ここから イベント（てき・NPC・トリガーなど）----
      //   マップ作成ツールの「🎬 イベント」で 作った データを そのまま わたす。
      //   walk（絵の むき）は 絵文字を つかう キャラの ため。しゅじんこう・
      //   きゃらの 絵じたいは js/scenario.js の window.WALKS に あるので、
      //   ここでは true/false だけ わたし、面ファイル（js/stages/◯◯.js）が つけかえる。
      player: data.player ? { ...data.player } : null,
      enemies: (data.enemies || []).map((e) => ({ ...e })),
      npcs: (data.npcs || [])
        .filter((n) => {
          // stage2 で重複していた古い黄色絵文字妖精NPC（s2n2 または 妖精の ベル）を除外
          if (
            data.name === "stage2" &&
            (n.id === "s2n2" || n.name === "妖精の ベル" || (n.sprite === "🧚" && n.name !== "ベル"))
          ) {
            return false;
          }
          return true;
        })
        .map((n) => ({ ...n })),
      chests: (data.chests || []).map((c) => ({ ...c })),
      checkpoints: (data.checkpoints || []).map((c) => ({ ...c })),
      triggers: (data.triggers || []).map((t) => ({ ...t })),
      gates: (data.gates || []).map((g) => ({ ...g })),
      boulders: (data.boulders || []).map((b) => ({ ...b })),
      exit: data.exit ? { ...data.exit } : null,
      hints: (data.hints || []).map((h) => ({ ...h })),
      intro: data.intro ? JSON.parse(JSON.stringify(data.intro)) : null,
    };
  }

  // ---- マップエディタ連携：編集されたマップデータの取得 ----
  function getEditedMap(stageId) {
    if (!stageId || typeof localStorage === "undefined") return null;
    const target = String(stageId).toLowerCase();
    const fileMap = (typeof window !== "undefined" && window.MAPS && window.MAPS[target]) || null;
    const fileTime = (fileMap && fileMap.updatedAt) || 0;

    function isValidCustomMap(d) {
      if (!d || !d.world) return false;
      // ファイル側のマップが新しく更新された場合（d.updatedAt <= fileTime）、古いエディタキャッシュは無効
      if (fileTime && (d.updatedAt || 0) <= fileTime) return false;
      // stage2で旧マップ（高さ1800、川がない）の残骸なら無効化
      if (target === "stage2") {
        if ((d.world.height || 0) < 3000 || !d.areas || !d.areas.some((a) => a.river)) {
          return false;
        }
      }
      return true;
    }

    try {
      // 1. 特定面のキー (riiko.map.stage1 など)
      const specific = localStorage.getItem("riiko.map." + target);
      if (specific) {
        const d = JSON.parse(specific);
        if (isValidCustomMap(d)) {
          return d;
        } else {
          // 古い・無効なキャッシュは自動削除
          localStorage.removeItem("riiko.map." + target);
        }
      }
      // 2. 現在エディタで編集中のマップ (riiko.mapeditor.v1)
      const current = localStorage.getItem("riiko.mapeditor.v1");
      if (current) {
        const d = JSON.parse(current);
        if (d && d.world) {
          const dName = String(d.name || "").toLowerCase();
          if (dName === target || (!dName && target === "stage1")) {
            if (isValidCustomMap(d)) {
              return d;
            } else {
              localStorage.removeItem("riiko.mapeditor.v1");
            }
          }
        }
      }
    } catch (e) {
      console.warn("MapData.getEditedMap error:", e);
    }
    return null;
  }

  // ---- 友達（ハナ）がさらわれるオープニング（カットシーン）の作成 ----
  function createPrologueCutscene(px, py) {
    const x = px != null ? px : 514;
    const y = py != null ? py : 1852;
    return {
      once: "prologueDone",
      cutscene: {
        steps: [
          {
            look: { x: x, y: y },
            wait: 0.8,
          },
          {
            spawn: {
              id: "hana",
              x: x + 66,
              y: y - 12,
              sprite: "👧",
              size: 72,
              name: "ハナ",
              walkKey: "hana",
            },
          },
          {
            name: "ハナ",
            lines: [
              "リイコ、きょうも あそぼ！",
              "きょうは どこまで 行く？",
            ],
          },
          {
            name: "リイコ",
            lines: [
              "森の 入口まで！ …あ、でも ばあちゃんに おこられるかな",
            ],
          },
          {
            spawn: {
              id: "mant",
              x: x + 16,
              y: y - 250,
              sprite: "🥷",
              size: 64,
              name: "？？？",
            },
          },
          {
            look: { x: x + 16, y: y - 180 },
            sfx: "down",
            wait: 0.7,
          },
          {
            name: "ハナ",
            lines: ["…だれ？"],
          },
          {
            move: {
              id: "mant",
              x: x + 56,
              y: y - 22,
              sec: 0.9,
            },
          },
          {
            name: "かげマント",
            lines: ["さがして いたぞ。…その 子を もらって いく"],
          },
          {
            sfx: "hurt",
            wait: 0.3,
          },
          {
            name: "ハナ",
            lines: ["きゃっ！ リ、リイコ —— たすけて！"],
          },
          {
            move: {
              id: "mant",
              x: x - 34,
              y: y - 300,
              sec: 1.4,
              with: ["hana"],
            },
          },
          {
            look: { x: x - 34, y: y - 300 },
            wait: 0.5,
          },
          {
            despawn: ["mant", "hana"],
          },
          {
            name: "リイコ",
            lines: [
              "ハナ！！",
              "…行っちゃった。北の 森の ほうへ。",
            ],
          },
          {
            look: { x: x, y: y },
            wait: 0.5,
          },
          {
            mutter: "（剣を もって、ハナを たすけに 行かなきゃ！）",
          },
        ],
      },
    };
  }

  // ---- マップエディタ連携：編集されたマップデータをステージに適用 ----
  function applyMapToStage(stage, rawData) {
    if (!stage || !rawData) return stage;
    const built = build(rawData);
    const PLAYER_WALK = (typeof window !== "undefined" && window.WALKS && window.WALKS.player) || null;
    const ENEMY_WALK = (typeof window !== "undefined" && window.WALKS && window.WALKS.enemy) || null;

    if (built.world) stage.world = built.world;
    if (built.obstacles) stage.obstacles = built.obstacles;
    if (built.decorations) stage.decorations = built.decorations;

    // 主人公
    if (built.player && built.player.x != null) {
      stage.player = {
        ...(stage.player || {}),
        ...built.player,
        walk: (stage.player && stage.player.walk) || PLAYER_WALK,
      };
    }

    // 敵：スタート地点から近すぎる敵（意図しない配置）は除外
    if (Array.isArray(rawData.enemies)) {
      const px = (stage.player && stage.player.x != null) ? stage.player.x : 514;
      const py = (stage.player && stage.player.y != null) ? stage.player.y : 1852;
      const filtered = built.enemies.filter((e) => {
        if (e.behavior === "dummy" || e.dummy || e.id === "kakashi1") return true;
        const d = Math.hypot((e.x || 0) - px, (e.y || 0) - py);
        return d > 480; // スタート地点のすぐ右や近くにいる通常の敵を除外
      });
      stage.enemies = filtered.map((e) => {
        const { walk, ...rest } = e;
        const walkKey = e.walkKey || (typeof walk === "string" ? walk : "enemy");
        const walkData = (typeof window !== "undefined" && window.WALKS && window.WALKS[walkKey]) || ENEMY_WALK;
        return walk ? { ...rest, walk: walkData, walkKey: walkKey } : rest;
      });
    }

    // NPC：エディタの配置（x, y）を反映しつつ、セリフやシナリオフラグはJSファイル側の最新版を優先
    if (Array.isArray(rawData.npcs) && rawData.npcs.length > 0) {
      const stageKey = rawData.name || (stage.title && stage.title.includes("2面") ? "stage2" : "stage1");
      const fileMap = (typeof window !== "undefined" && window.MAPS && window.MAPS[stageKey]) || null;
      const fileNpcMap = {};
      if (fileMap && Array.isArray(fileMap.npcs)) {
        for (const fn of fileMap.npcs) fileNpcMap[fn.id] = fn;
      }
      stage.npcs = built.npcs.map((n) => {
        const fileNpc = fileNpcMap[n.id];
        if (fileNpc) {
          return {
            ...n,
            name: fileNpc.name || n.name,
            lines: fileNpc.lines || n.lines,
            variants: fileNpc.variants || n.variants,
            set: fileNpc.set !== undefined ? fileNpc.set : n.set,
            ifNot: fileNpc.ifNot !== undefined ? fileNpc.ifNot : n.ifNot,
            if: fileNpc.if !== undefined ? fileNpc.if : n.if,
            r: fileNpc.r || n.r,
          };
        }
        return n;
      });
    }

    // 宝箱・チェックポイント・トリガー・出口・ゲート・ヒント
    if (Array.isArray(rawData.chests)) stage.chests = built.chests;
    if (Array.isArray(rawData.checkpoints)) stage.checkpoints = built.checkpoints;
    if (Array.isArray(rawData.triggers)) stage.triggers = built.triggers;
    if (Array.isArray(rawData.gates)) stage.gates = built.gates;
    if (Array.isArray(rawData.boulders)) stage.boulders = built.boulders;
    if (built.exit) stage.exit = built.exit;
    if (Array.isArray(rawData.hints) && rawData.hints.length > 0) stage.hints = built.hints;

    // オープニング（友達がさらわれるカットシーン）
    // ★オープニングは 1面（stage1）だけで再生する
    const isStage1 = (rawData.name && String(rawData.name).toLowerCase() === "stage1") || (stage && stage.title && stage.title.includes("1面"));
    const introSteps = (rawData.intro && rawData.intro.cutscene && rawData.intro.cutscene.steps) || [];
    if (introSteps.length > 1) {
      stage.intro = built.intro;
    } else if (isStage1) {
      const px = (stage.player && stage.player.x != null) ? stage.player.x : 514;
      const py = (stage.player && stage.player.y != null) ? stage.player.y : 1852;
      stage.intro = createPrologueCutscene(px, py);
    } else {
      stage.intro = null;
    }

    return stage;
  }

  // ---- エディタ連携：保存 ----
  function saveEditedMap(stageId, rawData) {
    if (!stageId || !rawData || typeof localStorage === "undefined") return false;
    const key = "riiko.map." + String(stageId).toLowerCase();
    try {
      const fileMap = (typeof window !== "undefined" && window.MAPS && window.MAPS[stageId]) || null;
      const fileTime = (fileMap && fileMap.updatedAt) || 0;
      rawData.updatedAt = Math.max(Date.now(), fileTime + 1000);
      localStorage.setItem(key, JSON.stringify(rawData));
      localStorage.setItem("riiko.mapeditor.v1", JSON.stringify(rawData));
      localStorage.setItem("riiko.map.last_updated", String(Date.now()));
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const ch = new BroadcastChannel("riiko-map-sync");
          ch.postMessage({ type: "map-updated", stageId: stageId, timestamp: Date.now(), map: rawData });
          ch.close();
        } catch (e) {}
      }
      return true;
    } catch (e) {
      console.warn("MapData.saveEditedMap error:", e);
      return false;
    }
  }

  // ---- エディタ連携：削除（リセット） ----
  function clearEditedMap(stageId) {
    if (!stageId || typeof localStorage === "undefined") return false;
    const key = "riiko.map." + String(stageId).toLowerCase();
    try {
      localStorage.removeItem(key);
      const cur = localStorage.getItem("riiko.mapeditor.v1");
      if (cur) {
        const d = JSON.parse(cur);
        if (d && String(d.name || "").toLowerCase() === String(stageId).toLowerCase()) {
          localStorage.removeItem("riiko.mapeditor.v1");
        }
      }
      localStorage.setItem("riiko.map.last_updated", String(Date.now()));
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const ch = new BroadcastChannel("riiko-map-sync");
          ch.postMessage({ type: "map-cleared", stageId: stageId, timestamp: Date.now() });
          ch.close();
        } catch (e) {}
      }
      return true;
    } catch (e) {
      return false;
    }
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
    createPrologueCutscene,
    getEditedMap,
    applyMapToStage,
    saveEditedMap,
    clearEditedMap,
  };
})();
