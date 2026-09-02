/*
 * =========================================================
 *  ゲームエンジン（うごく しくみ）
 * =========================================================
 *  ふつうは ここは さわらなくて大丈夫。
 *  おはなしを変えたいときは js/scenario.js を編集してください。
 * =========================================================
 */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ---- キャラの当たりの大きさ（半径） ----
  const PLAYER_R = 18;
  const CAT_R = 14;
  const ENEMY_R = 18;
  const TAP_R = 40; // 敵をタップしたと判定する ゆるさ
  const NPC_TALK_R = 30; // じゅうにんに 話しかける きょり（ちかづかないと 話さない）

  // ---- あるく絵（アニメ）の せってい ----
  const WALK_DIRS = ["down", "up", "left", "right"];
  const WALK_FRAME_SEC = 0.16; // 1コマを 出しつづける 時間（小さいほど 足が はやく うごく）
  const WALK_FOOT = 0.96; // 絵の中で 足のうらが ある たかさ（0=いちばん上, 1=いちばん下）

  // ---- 画面サイズ（固定）----
  //   ゲームの中の大きさは いつも LOGICAL_W × LOGICAL_H。
  //   じっさいの表示は、画面に合わせて 拡大/縮小します（アスペクト比は固定）。
  const LOGICAL_W = 900;
  const LOGICAL_H = 600;
  let viewW = LOGICAL_W,
    viewH = LOGICAL_H,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = LOGICAL_W;
    viewH = LOGICAL_H;
    canvas.width = Math.floor(LOGICAL_W * dpr);
    canvas.height = Math.floor(LOGICAL_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 画面に収まるように CSS 表示サイズを決める（アスペクト比は固定）
    const scale = Math.min(
      window.innerWidth / LOGICAL_W,
      window.innerHeight / LOGICAL_H
    );
    canvas.style.width = Math.round(LOGICAL_W * scale) + "px";
    canvas.style.height = Math.round(LOGICAL_H * scale) + "px";
  }
  window.addEventListener("resize", resize);

  // =========================================================
  //  こうかおん（音の ファイルは つかわず、その場で 作る）
  // =========================================================
  const Sfx = (function () {
    let ac = null;
    let on = true;
    function ctx() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    // ひとつの 音（しゅるい・高さ・長さ・大きさ・すべる先）
    function tone(type, f0, f1, dur, vol, delay) {
      const c = ctx();
      if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    // ざらっとした 音（ノイズ）
    function noise(dur, vol, delay) {
      const c = ctx();
      if (!c) return;
      const t = c.currentTime + (delay || 0);
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < n; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff; // Math.random を つかわない
        d[i] = ((seed / 0x7fffffff) * 2 - 1) * (1 - i / n);
      }
      const s = c.createBufferSource();
      const g = c.createGain();
      s.buffer = buf;
      g.gain.value = vol;
      s.connect(g);
      g.connect(c.destination);
      s.start(t);
    }
    const BANK = {
      swing: () => { tone("triangle", 780, 320, 0.09, 0.10); noise(0.06, 0.05); },
      swingBig: () => { tone("triangle", 900, 240, 0.16, 0.13); noise(0.12, 0.09); },
      nice: () => { tone("square", 440, 880, 0.09, 0.14); tone("square", 660, 1320, 0.14, 0.11, 0.07); },
      dash: () => { tone("sawtooth", 160, 420, 0.22, 0.12); noise(0.18, 0.07); },
      dizzy: () => { tone("sine", 700, 240, 0.35, 0.10); },
      hit: () => { tone("square", 260, 90, 0.11, 0.16); noise(0.07, 0.10); },
      dummy: () => { tone("triangle", 200, 140, 0.09, 0.10); noise(0.05, 0.06); },
      hurt: () => { tone("sawtooth", 320, 110, 0.22, 0.14); },
      down: () => { tone("sawtooth", 400, 70, 0.55, 0.16); },
      defeat: () => { tone("square", 520, 780, 0.10, 0.12); tone("square", 780, 1040, 0.12, 0.10, 0.09); },
      chest: () => { tone("sine", 660, 660, 0.10, 0.14); tone("sine", 880, 880, 0.14, 0.12, 0.09); },
      solved: () => {
        [523, 659, 784, 1046].forEach((f, i) => tone("sine", f, f, 0.16, 0.12, i * 0.09));
      },
      talk: () => { tone("sine", 620, 620, 0.05, 0.06); },
    };
    return {
      play(name) {
        if (!on) return;
        try { (BANK[name] || (() => {}))(); } catch (e) {}
      },
      toggle(v) { on = v; },
      warmUp() { ctx(); },
    };
  })();

  // ---- ゲームの状態 ----
  const G = {
    running: false,
    paused: false, // かいわ中は true
    last: 0,
    hitstop: 0, // 当たった しゅんかん 止まる
    shake: 0, // 画面の ゆれ
    downT: 0, // やられて いる あいだ
    respawn: { x: 0, y: 0 }, // やられたとき もどる ところ
    cam: { x: 0, y: 0 },
    world: null,
    player: null,
    partner: null,
    enemies: [],
    chests: [],
    npcs: [],
    obstacles: [],
    decorations: [],
    bullets: [],
    floaters: [], // ふわっと出る文字（ダメージなど）
    gates: [], // とびら（なぞ解きで あく）
    exit: null, // つぎのステージへの 出口
    items: {}, // あつめたアイテムの数（例：{ ほうせき: 2 }）
    bossDefeated: false,
    keys: {},
    move: { active: false, tx: 0, ty: 0 }, // 「ここへ歩く」目標
    // ---- 面・きろく（Ph2）----
    stageId: null, // いま あそんで いる 面
    flags: {}, // おはなしの すすみぐあい（例：{ talkedToTaro: true }）
    talks: {}, // だれと 何回 話したか（ヒントを こくする のに つかう）
    opened: {}, // あけた たからばこ の id
    defeated: {}, // たおした てき の id
    triggers: [], // 通ると 何かが おきる ばしょ
    checkpoints: [], // やられた とき もどる ばしょ
    actors: [], // カットシーンに だけ 出る 人（ハナ・かげマント など）
    titleT: 0, // 面の なまえを 出して いる のこり 時間
    titleText: "",
    cut: null, // カットシーン（カメラを 動かして セリフを 出す）
    fairy: null, // 仲間1 妖精ピカ（加入するまでは null）
    // ---- こまって いないか 見はる（Ph3.5 / Ph5）----
    stuckT: 0, // すすまなく なって から の 時間
    hintLv: 0, // 出した ヒントの こさ（0＝まだ / 1〜3）
    guide: null, // ヒント3で 光らせる ばしょ
    guideT: 0,
    deaths: {}, // どの てきに 何回 やられたか
    lastFoe: null, // さいごに ダメージを くれた てき
    helpMode: false, // おたすけモード（手で えらべる）
  };

  // ヒントが 出る までの 時間（びょう）
  const HINT_SEC = [90, 180, 300];

  // ---- 「すすんだ」と きろく する（ヒントの タイマーを もどす）----
  function madeProgress() {
    G.stuckT = 0;
    G.hintLv = 0;
    G.guide = null;
  }

  // ---- そのときに 出す セリフを えらぶ ----
  //   ふつうは lines。variants を 書くと、じょうけんや 話した 回数で かえられる。
  //     variants: [
  //       { minTalks: 3, lines: [...] },   // 3回目 いこう
  //       { if: "sawCastle", lines: [...] },
  //       { lines: [...] },                // どれにも 当てはまらない とき
  //     ]
  function pickLines(n) {
    const list = n.variants;
    if (!list || !list.length) return n.lines || [""];
    const talks = G.talks[n.id] || 1;
    for (const v of list) {
      if (v.minTalks && talks < v.minTalks) continue;
      if (!condOk(v)) continue;
      return v.lines;
    }
    return n.lines || [""];
  }

  // =========================================================
  //  カットシーン（カメラを 動かして セリフを 出す）
  // =========================================================
  //   シナリオの かきかた：
  //     cutscene: { look: { x: 700, y: 160 }, lines: ["…"], hold: 1.2, name: "リイコ" }
  //  かきかた（かんたんな かたち）
  //    cutscene: { look:{x,y}, hold:1.2, name:"リイコ", lines:["…"] }
  //  かきかた（じゅんばんに いろいろ する）
  //    cutscene: { steps: [
  //      { look:{x:700,y:2200}, wait:0.6 },              // カメラを 動かす／まつ
  //      { name:"ハナ", lines:["…"] },                    // セリフ
  //      { spawn:{ id:"mant", x:700, y:1990, sprite:"🥷", size:64 } }, // 人を 出す
  //      { move:{ id:"mant", x:700, y:2150, sec:0.9 } },  // 人を うごかす
  //      { move:{ id:"mant", x:700, y:1900, sec:1.4, with:["hana"] } }, // いっしょに
  //      { despawn:["mant","hana"] },                     // 人を 消す
  //      { set:"prologueDone" },                          // フラグを 立てる
  //    ] }
  function startCutscene(cs) {
    let steps = cs.steps;
    if (!steps) {
      // むかしの かんたんな かたちを steps に なおす
      steps = [];
      if (cs.look) steps.push({ look: cs.look, wait: cs.hold == null ? 1.0 : cs.hold });
      if (cs.lines && cs.lines.length) steps.push({ name: cs.name || "", lines: cs.lines });
    }
    G.cut = { steps: steps.slice(), i: -1, look: null, wait: 0, move: null };
    G.paused = true; // うごけない（見せ場だから）
    nextCutStep();
  }

  function findActor(id) {
    for (const a of G.actors) if (a.id === id) return a;
    return null;
  }

  function nextCutStep() {
    const c = G.cut;
    if (!c) return;
    c.i += 1;
    if (c.i >= c.steps.length) {
      endCutscene();
      return;
    }
    const st = c.steps[c.i];

    if (st.look) c.look = st.look;
    if (st.set) G.flags[st.set] = true;

    if (st.spawn) {
      const a = { dir: "down", frame: 0, animT: 0, size: 56, ...st.spawn };
      a.walk = st.spawn.walk ? loadWalk(st.spawn.walk) : null;
      G.actors.push(a);
    }
    if (st.despawn) {
      const ids = Array.isArray(st.despawn) ? st.despawn : [st.despawn];
      G.actors = G.actors.filter((a) => ids.indexOf(a.id) < 0);
    }
    if (st.sfx) Sfx.play(st.sfx);

    // うごかす
    if (st.move) {
      const who = [st.move.id].concat(st.move.with || []);
      const list = who.map(findActor).filter(Boolean);
      c.move = {
        list: list.map((a) => ({ a: a, x0: a.x, y0: a.y })),
        dx: st.move.x,
        dy: st.move.y,
        sec: st.move.sec || 1,
        t: 0,
      };
      c.wait = 0;
      return; // うごき おわったら つぎへ
    }

    // セリフ
    if (st.lines && st.lines.length) {
      Dialogue.open(st.name || "", st.lines, () => nextCutStep());
      return;
    }

    // まつ
    c.wait = st.wait == null ? 0.4 : st.wait;
    if (c.wait <= 0) nextCutStep();
  }

  function updateCutscene(dt) {
    const c = G.cut;
    if (!c) return;

    // 人が うごいて いる とちゅう
    if (c.move) {
      const m = c.move;
      m.t += dt;
      const k = Math.min(1, m.t / m.sec);
      for (const it of m.list) {
        const nx = it.x0 + (m.dx - it.x0) * k;
        const ny = it.y0 + (m.dy - it.y0) * k;
        advanceWalk(it.a, dt, nx - it.a.x, ny - it.a.y);
        it.a.x = nx;
        it.a.y = ny;
      }
      if (k >= 1) {
        c.move = null;
        nextCutStep();
      }
      return;
    }

    // まって いる とちゅう
    if (c.wait > 0) {
      c.wait -= dt;
      if (c.wait <= 0) nextCutStep();
    }
  }

  function endCutscene() {
    if (!G.cut) return;
    G.cut = null;
    G.actors = [];
    G.paused = false;
    saveGame();
  }

  // カットシーン中の カメラの 目あて（なめらかに 近づく）
  function cutCamTarget() {
    const c = G.cut;
    if (!c || !c.look) return null;
    return c.look;
  }

  // =========================================================
  //  仲間1：妖精ピカ（Ph4）
  // =========================================================
  //  ・しゅじんこうの ななめ上を ふわふわ とぶ
  //  ・かってに しゃべる（おなじ ことばは つづけて 言わない）
  //  ・ヒントを 言う（💡ボタン／こまった とき）
  //  ・ピンチに なると 薬を とりに 飛んで いって もどってくる
  function makeFairy(src, px, py) {
    return {
      sprite: src.sprite || "🧚",
      name: src.name || "ピカ",
      size: src.size || 34,
      x: px + 30,
      y: py - 40,
      bob: 0,
      // おしゃべり
      say: "", // いま 出て いる ふきだし
      sayT: 0,
      talkCd: 6, // つぎに しゃべるまで
      lastSaid: "", // つづけて 同じ ことを 言わない
      // 薬
      potionsLeft: src.potions == null ? 2 : src.potions, // 1つの 面で 何回まで
      errand: null, // 薬を とりに 行って いる とちゅう
      lines: src.lines || {},
    };
  }

  // ピカに しゃべらせる
  function speakFairy(text, sec) {
    const f = G.fairy;
    if (!f || !text) return;
    if (text === f.lastSaid) return; // つづけて 同じ ことは 言わない
    f.say = text;
    f.sayT = sec || 3.2;
    f.lastSaid = text;
    f.talkCd = 7 + (text.length % 4);
  }

  // そのときの ようすに あった ひとことを えらぶ
  function fairyChatter(dt) {
    const f = G.fairy;
    const p = G.player;
    f.talkCd -= dt;
    if (f.talkCd > 0) return;

    const L = f.lines;
    let pool = L.idle || [];
    // てきが 近い
    const near = G.enemies.some(
      (e) => e.alive && !e.dummy && dist(e.x, e.y, p.x, p.y) < 200
    );
    if (near && L.enemy) pool = L.enemy;
    // たからばこが 近い
    else if (
      L.chest &&
      G.chests.some((c) => !c.opened && dist(c.x, c.y, p.x, p.y) < 220)
    )
      pool = L.chest;
    // ハートが へって いる
    else if (L.hurt && p.hp < p.maxHp) pool = L.hurt;

    if (!pool.length) {
      f.talkCd = 5;
      return;
    }
    // Math.random は つかわない（ならびを ずらして えらぶ）
    const i = Math.floor((G.stuckT * 7 + p.x + p.y) % pool.length);
    speakFairy(pool[i], 3.2);
  }

  // ピンチ → 薬を とりに 行く
  function fairyPotion(dt) {
    const f = G.fairy;
    const p = G.player;
    if (f.errand) {
      f.errand.t -= dt;
      if (f.errand.t <= 0) {
        // もどって きた
        p.hp = Math.min(p.maxHp, p.hp + 1);
        addFloater(p.x, p.y - 60, "ピカが 薬を くれた！💊", "#9fd");
        Sfx.play("chest");
        speakFairy("はい、これ のんで！", 3);
        f.errand = null;
      }
      return;
    }
    if (f.potionsLeft <= 0) return;
    if (p.hp > 1 || G.downT > 0) return; // ハートが 1つに なったら
    f.potionsLeft -= 1;
    f.errand = { t: 2.4 };
    speakFairy("あぶない！ 薬 とってくる！", 3);
  }

  // 面の とちゅうで 仲間に なった とき、その場で 出てくる（要件C6：うれしい 出来事に する）
  function checkFairyJoin() {
    if (G.fairy) return;
    const sc = window.STAGES[G.stageId];
    const src = sc && sc.fairy;
    if (!src || !src.if || !G.flags[src.if]) return;
    G.fairy = makeFairy(src, G.player.x, G.player.y);
    const btn = document.getElementById("btn-hint");
    if (btn) btn.classList.remove("hidden");
    addFloater(G.player.x, G.player.y - 74, (src.name || "ピカ") + "が なかまに なった！✨", "#ffe36b");
    Sfx.play("solved");
    speakFairy("よろしくね、リイコ！", 4);
    madeProgress();
  }

  function updateFairy(dt) {
    const f = G.fairy;
    if (!f) return;
    const p = G.player;
    f.bob += dt * 3.4;
    if (f.sayT > 0) f.sayT -= dt;

    // 薬を とりに 行って いる あいだは はなれる
    let tx, ty;
    if (f.errand) {
      tx = p.x + 140;
      ty = p.y - 160;
    } else {
      tx = p.x + 34 + Math.sin(f.bob * 0.7) * 10;
      ty = p.y - 46 + Math.sin(f.bob) * 7;
    }
    f.x += (tx - f.x) * Math.min(1, dt * 4.5);
    f.y += (ty - f.y) * Math.min(1, dt * 4.5);

    fairyChatter(dt);
    fairyPotion(dt);
  }

  function drawFairy(ox, oy) {
    const f = G.fairy;
    if (!f) return;
    drawSprite(f.sprite, f.x + ox, f.y + oy, f.size);
    if (f.sayT > 0) drawBubble(f.say, f.x + ox, f.y + oy - 26);
  }

  // ふきだし（ピカの ひとこと。かいわ まどは 出さない＝止まらない）
  function drawBubble(text, x, y) {
    if (!text) return;
    ctx.font = "14px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 18;
    const bx = clamp(x, w / 2 + 4, viewW - w / 2 - 4);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(bx - w / 2, y - 13, w, 26, 12);
    ctx.fill();
    ctx.fillStyle = "#2b3a2f";
    ctx.fillText(text, bx, y);
  }

  // =========================================================
  //  ヒント（Ph3.5）
  // =========================================================
  //  シナリオに こう 書く：
  //    hints: [
  //      { ifNot: "sawFootprints",
  //        lines: ["（ぼんやり）", "（すこし くわしく）", "（ほとんど 答え）"],
  //        point: { x: 700, y: 1280 } },   // ヒント3で 光る ばしょ
  //      …うえから じゅんに 見て、さいしょに 当てはまった ものを つかう
  //    ]
  //  ★1面は 妖精ピカが いないので、リイコの「思い出し」として 出る。
  //    2面いこうは ピカが しゃべる（fairy が いれば そちらが 言う）。
  function currentHint() {
    const sc = window.STAGES[G.stageId];
    const list = (sc && sc.hints) || [];
    for (const h of list) if (condOk(h)) return h;
    return null;
  }

  // ヒントを 出す（lv: 1〜3）
  function showHint(lv) {
    const h = currentHint();
    if (!h) return false;
    const line = h.lines[Math.min(lv, h.lines.length) - 1];
    if (!line) return false;
    const p = G.player;
    if (G.fairy) {
      // ピカが いる ときは ピカが 言う
      speakFairy(line, 4.5);
    } else {
      addFloater(p.x, p.y - 52, line, "#dff");
    }
    Sfx.play("talk");
    // ヒント3では 行き先を 光らせる
    if (lv >= 3 && h.point) {
      G.guide = { x: h.point.x, y: h.point.y };
      G.guideT = 25; // しばらく 光って いる
    }
    return true;
  }

  // こまって いないか 見はる
  function updateStuck(dt) {
    if (G.paused || G.cut || G.downT > 0) return;
    G.stuckT += dt;
    if (G.guideT > 0) G.guideT -= dt;
    if (G.guideT <= 0) G.guide = null;

    const want = G.helpMode ? 1 : 0; // おたすけモードは 早めに 出す
    for (let lv = 3; lv >= 1; lv--) {
      const need = HINT_SEC[lv - 1] * (G.helpMode ? 0.5 : 1);
      if (G.hintLv < lv && G.stuckT >= need) {
        if (showHint(lv)) G.hintLv = lv;
        return;
      }
    }
    void want;
  }

  // ---- じょうけん（フラグ）を みたして いるか ----
  //   シナリオに if:"◯◯" / ifNot:"◯◯" と 書くだけで 出しわけできる
  function condOk(o) {
    if (!o) return true;
    if (o.if && !G.flags[o.if]) return false;
    if (o.ifNot && G.flags[o.ifNot]) return false;
    return true;
  }
  // ---- フラグを 立てる（set:"◯◯" と 書く）----
  function applySet(o) {
    if (o && o.set) {
      G.flags[o.set] = true;
      madeProgress(); // 話が すすんだ ので ヒントの タイマーを もどす
    }
  }

  // ---- しょきか ----
  function setup(scenario) {
    G.world = scenario.world;
    G.obstacles = (scenario.obstacles || []).map((o) => ({ ...o }));
    G.decorations = (scenario.decorations || []).map((d) => ({ ...d }));

    G.player = {
      x: scenario.player.x,
      y: scenario.player.y,
      sprite: scenario.player.sprite,
      name: scenario.player.name,
      speed: 150,
      moving: false,
      stuckT: 0,
      trail: [], // 通ったあと（ねこが これを おいかける）
      // ---- 剣で たたかう（Ph1）----
      dirX: 0,
      dirY: 1, // むいている ほう（さいごに 動いた ほう）
      maxHp: scenario.player.maxHp || 3, // ハートの かず
      hp: scenario.player.maxHp || 3,
      attack: scenario.player.attack || 5,
      atkT: 0, // 剣を ふって いる あいだ（見た目）
      atkCd: 0, // つぎに ふれるまで
      invT: 0, // むてき じかん（つづけて 減らない）
      combo: 0, // 何はつめ か（1→2→3）
      comboT: 0, // つづけて ふったと みなす のこり 時間
    };
    initWalker(G.player, scenario.player, 68); // あるく絵（4方向×2まい）
    G.respawn = { x: scenario.player.x, y: scenario.player.y };
    G.downT = 0;
    G.hitstop = 0;
    G.shake = 0;

    // ★仲間は いない ことも ある（3面で ミィが 加わる まで は null）
    G.partner = !scenario.partner ? null : {
      x: scenario.player.x - 44,
      y: scenario.player.y + 26,
      sprite: scenario.partner.sprite,
      name: scenario.partner.name,
      maxHp: scenario.partner.maxHp,
      hp: scenario.partner.maxHp,
      attack: scenario.partner.attack,
      state: "follow", // follow / attack / rest / goto
      target: null,
      gotoX: 0,
      gotoY: 0,
      atkCd: 0,
      restT: 0,
      bob: 0,
      wanderT: 0,
      idleT: 0,
      orbitA: 0,
    };

    // てき：じょうけんを みたす もの だけ／たおした ものは 出さない
    G.enemies = (scenario.enemies || []).filter(condOk).map((e) => {
      const ent = {
        ...e,
        hp: e.maxHp,
        alive: true,
        atkCd: 0,
        shootCd: e.shootInterval ? e.shootInterval * 0.6 : 0,
        phase: 0,
        home: { x: e.x, y: e.y },
        dummy: e.behavior === "dummy", // かかし＝うごかない・こうげきしない・こわれない
        touchCd: 0, // ぶつかって リイコに ダメージを あたえる 間かく
        knockX: 0,
        knockY: 0,
        knockT: 0, // 斬られて うしろに さがる
        flashT: 0, // 斬られて 白く 光る
        attackedT: 9, // さいごに こうげきして から の 時間（ジャスト反げき用）
        // 突進ネコ用
        chargeState: "wait", // wait → windup → dash → dizzy
        chargeT: 0.6,
        dashX: 0,
        dashY: 0,
      };
      initWalker(ent, e, 58); // あるく絵（walk を 書いた てき だけ）
      return ent;
    });

    // たおした てきは そのまま（セーブから もどした ときも おなじ）
    for (const e of G.enemies) if (G.defeated[e.id]) e.alive = false;

    G.chests = (scenario.chests || [])
      .filter(condOk)
      .map((c) => ({ ...c, opened: !!G.opened[c.id] }));
    G.npcs = (scenario.npcs || []).map((n) => ({ ...n, _inside: false }));
    G.actors = [];
    // ★仲間1 ピカ：加入フラグが 立って いる ときだけ 出す
    G.fairy =
      scenario.fairy && (!scenario.fairy.if || G.flags[scenario.fairy.if])
        ? makeFairy(scenario.fairy, G.player.x, G.player.y)
        : null;
    const hintBtn = document.getElementById("btn-hint");
    if (hintBtn) hintBtn.classList.toggle("hidden", !G.fairy);
    G.triggers = (scenario.triggers || []).map((t) => ({ ...t, _done: false, _inside: false }));
    G.checkpoints = (scenario.checkpoints || []).map((c) => ({ ...c, _done: false }));

    // とびら：かべ(木/レンガ)を 障害物に くわえる（あいたら 消える）
    G.gates = (scenario.gates || []).filter(condOk).map((g) => ({ ...g, open: false, _inside: false }));
    for (const g of G.gates) {
      for (const w of g.wall || []) {
        G.obstacles.push({ ...w, gateId: g.id });
      }
    }

    G.exit = scenario.exit ? { ...scenario.exit, _done: false } : null;
    G.bossDefeated = false;
    G.bullets = [];
    G.floaters = [];
    G.move.active = false;
    G.paused = false;
    const dlg = document.getElementById("dialogue");
    if (dlg) dlg.classList.add("hidden");
  }

  // ---- あるく絵を よみこむ ----
  //   scenario.js の walk:{down:[…], up:[…], left:[…], right:[…]} を 画像に する。
  //   1つでも 足りなければ null（＝絵文字の まま あそべる）。
  const walkCache = new Map(); // 同じ絵は 1回だけ よみこむ
  function loadWalk(paths) {
    if (!paths) return null;
    if (walkCache.has(paths)) return walkCache.get(paths);
    let set = {};
    for (const dir of WALK_DIRS) {
      const list = paths[dir];
      if (!list || list.length < 2) {
        set = null;
        break;
      }
      set[dir] = list.slice(0, 2).map((src) => {
        const img = new Image();
        img.src = src;
        return img;
      });
    }
    walkCache.set(paths, set);
    return set;
  }

  // キャラに あるく絵の じょうたいを もたせる
  function initWalker(ent, src, defaultSize) {
    ent.walk = loadWalk(src.walk);
    ent.size = src.size || defaultSize;
    ent.dir = src.dir || "down"; // いま むいている ほうこう
    ent.frame = 0; // いま出している コマ（0＝立ち / 1＝ふみだし）
    ent.animT = 0; // コマを 切りかえるまでの 時間かせぎ
  }

  // うごいた ほうこうから むきを きめて、コマを すすめる
  //   dx, dy … このフレームで うごいた 向き（大きさは 気にしない）
  function advanceWalk(ent, dt, dx, dy) {
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) {
      ent.animT = 0; // とまったら 1まいめ（立ち）に もどす
      ent.frame = 0;
      return;
    }
    // ななめの ときは よこむき を ゆうせん
    if (Math.abs(dx) >= Math.abs(dy)) ent.dir = dx < 0 ? "left" : "right";
    else ent.dir = dy < 0 ? "up" : "down";

    ent.animT += dt;
    while (ent.animT >= WALK_FRAME_SEC) {
      ent.animT -= WALK_FRAME_SEC;
      ent.frame = 1 - ent.frame;
    }
  }

  // ---- べんりな計算 ----
  function dist(ax, ay, bx, by) {
    const dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }
  function addFloater(x, y, text, color) {
    G.floaters.push({ x, y, text, color: color || "#fff", life: 0.9 });
  }

  // ---- しょうがいぶつ：めりこみを外に押し出す（スライドできる） ----
  function resolveObstacles(ent, radius) {
    for (const o of G.obstacles) {
      const dx = ent.x - o.x,
        dy = ent.y - o.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const min = o.r + radius;
      if (d < min) {
        if (d < 0.001) {
          ent.x = o.x + min;
        } else {
          ent.x = o.x + (dx / d) * min;
          ent.y = o.y + (dy / d) * min;
        }
      }
    }
  }

  // ---- ざひょうが 障害物と ぶつかっていないか（フェイルセーフ用） ----
  function isSafePosition(x, y, radius) {
    const r = radius || PLAYER_R;
    for (const o of G.obstacles) {
      if (dist(x, y, o.x, o.y) < o.r + r) return false;
    }
    return true;
  }

  // ---- しょうがいぶつを「自動でよける」進む向きの計算 ----
  function steerAround(x, y, dirX, dirY, radius) {
    let ax = dirX,
      ay = dirY;
    for (const o of G.obstacles) {
      const dx = o.x - x,
        dy = o.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const reach = o.r + radius + 26; // これより近い障害物をよける
      if (d < reach && d > 0.001) {
        const nx = dx / d,
          ny = dy / d;
        const ahead = nx * dirX + ny * dirY; // 進行方向の前にあるか
        if (ahead > 0) {
          const strength = (1 - d / reach) * ahead;
          // 障害物の横へ すべる向き（左右どちらか、今の向きに近いほう）
          let px = -ny,
            py = nx;
          if (px * dirX + py * dirY < 0) {
            px = ny;
            py = -nx;
          }
          ax += px * strength * 1.8;
          ay += py * strength * 1.8;
        }
      }
    }
    const len = Math.sqrt(ax * ax + ay * ay) || 1;
    return { x: ax / len, y: ay / len };
  }

  // 目標にむかって 1歩すすむ（よけ＋押し出しつき）
  function stepToward(ent, tx, ty, speed, dt, radius, avoid) {
    const dx = tx - ent.x,
      dy = ty - ent.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return 0;
    let dirX = dx / d,
      dirY = dy / d;
    if (avoid) {
      const s = steerAround(ent.x, ent.y, dirX, dirY, radius);
      dirX = s.x;
      dirY = s.y;
    }
    const step = Math.min(speed * dt, d);
    ent.x += dirX * step;
    ent.y += dirY * step;
    resolveObstacles(ent, radius);
    return step;
  }

  // ---- 入力：タップ／クリック ----
  //   画面上の指の位置（clientX/Y）を、ゲームの中の座標に変換する。
  //   canvas は 画面に合わせて拡大されているので、その ばいりつ を計算する。
  function clientToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const lx = (clientX - rect.left) * (LOGICAL_W / rect.width);
    const ly = (clientY - rect.top) * (LOGICAL_H / rect.height);
    return { x: lx + G.cam.x, y: ly + G.cam.y };
  }

  function findEnemyAt(wx, wy) {
    let best = null,
      bestD = TAP_R + 8;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const d = dist(wx, wy, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function handlePointer(clientX, clientY, isDown) {
    if (!G.running) return;

    // かいわ中は「つぎへ」だけ
    if (G.paused) {
      if (isDown) Dialogue.advance();
      return;
    }

    // タップ／クリックは「ねこ」への めいれい（主人公は うごかない）
    const w = clientToWorld(clientX, clientY);
    const e = findEnemyAt(w.x, w.y);
    if (e) {
      commandCat(e); // 敵をタップ＝あいぼうを差し向けて たたかう
    } else {
      commandCatMove(w.x, w.y); // じめんをタップ＝あいぼうを そこへ進ませる
    }
  }

  function commandCat(enemy) {
    if (!G.partner) return; // まだ 仲間が いない
    if (G.partner.state === "rest") return; // つかれ中は うごけない
    G.partner.target = enemy;
    G.partner.state = "attack";
    G.partner.atkCd = 0.2;
  }

  function commandCatMove(wx, wy) {
    if (!G.partner) return; // まだ 仲間が いない
    if (G.partner.state === "rest") return;
    G.partner.target = null;
    G.partner.state = "goto";
    G.partner.gotoX = clamp(wx, 10, G.world.width - 10);
    G.partner.gotoY = clamp(wy, 10, G.world.height - 10);
  }

  // =========================================================
  //  剣で たたかう（Ph1）
  // =========================================================
  const SWORD_REACH = 56; // 剣の とどく ながさ
  const SWORD_ARC = 0.3; // 前の どのくらい 広い はんいに 当たるか（小さいほど 広い）
  const COMBO_WINDOW = 0.75; // つづけて ふったと みなす 時間
  const JUST_WINDOW = 0.45; // てきの こうげきの すぐ あと＝ジャスト反げき

  function swingSword() {
    const p = G.player;
    if (!G.running || G.paused || G.downT > 0) return;
    if (p.atkCd > 0) return;

    // ---- 3だん コンボ（つづけて ふると 3はつめが つよい）----
    if (p.comboT > 0 && p.combo < 3) p.combo += 1;
    else p.combo = 1;
    p.comboT = COMBO_WINDOW;
    const finisher = p.combo === 3;

    p.atkCd = finisher ? 0.55 : 0.36;
    p.atkT = finisher ? 0.26 : 0.18;
    Sfx.play(finisher ? "swingBig" : "swing");

    const reach = SWORD_REACH * (finisher ? 1.25 : 1); // 3はつめは とどく はんいも 広い
    const arc = finisher ? 0.05 : SWORD_ARC;

    // 前方の おうぎ形に いる てきに 当たる
    let hitAny = false;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (d > reach + ENEMY_R) continue;
      const facing = (dx / d) * p.dirX + (dy / d) * p.dirY;
      if (facing < arc) continue; // うしろ・よこすぎる ものには 当たらない

      // ---- ごほうび：どれか 1つだけ つく ----
      //   ジャスト反げき（てきが こうげきした すぐ あと）… 2ばい
      //   目を まわして いる ところ            … 2ばい
      //   3だんめ                              … 1.8ばい
      let dmg = p.attack;
      let praise = null;
      if (e.attackedT < JUST_WINDOW || e.chargeState === "dizzy") {
        dmg = Math.round(p.attack * 2);
        praise = "ナイス！";
      } else if (finisher) {
        dmg = Math.round(p.attack * 1.8);
        praise = "ズバッ！";
      }
      hitEnemy(e, dmg, dx / d, dy / d, praise);
      hitAny = true;
    }
    return hitAny;
  }

  // てきに ダメージ（剣でも ミィでも ここを 通す＝手ざわりを そろえる）
  function hitEnemy(e, dmg, nx, ny, praise) {
    const big = !!praise;
    e.flashT = big ? 0.2 : 0.12;
    e.knockX = (nx || 0) * (big ? 420 : 260);
    e.knockY = (ny || 0) * (big ? 420 : 260);
    e.knockT = big ? 0.22 : 0.16;
    G.hitstop = big ? 0.09 : 0.05; // ★当たった しゅんかん 止まる（つよい ほど 長い）
    G.shake = big ? 10 : 5; // ★画面が ゆれる

    if (e.dummy) {
      // かかしは こわれない。手ごたえだけ かえす
      addFloater(e.x, e.y - 38, praise || "コンッ！", "#ffe36b");
      Sfx.play(big ? "nice" : "dummy");
      return;
    }
    e.hp -= dmg;
    // ★ほめる ことばは、成こう した ときだけ 出す（せつめいは しない）
    if (praise) {
      addFloater(e.x, e.y - 62, praise, "#ffe36b");
      addFloater(e.x, e.y - 38, "-" + dmg, "#ffd76b");
      Sfx.play("nice");
    } else {
      addFloater(e.x, e.y - 38, "-" + dmg, "#fff");
      Sfx.play("hit");
    }
    if (e.hp <= 0) defeatEnemy(e);
  }

  // リイコが ダメージを うける
  function damagePlayer(n) {
    const p = G.player;
    if (p.invT > 0 || G.downT > 0) return;
    p.hp -= n;
    p.invT = 1.0; // 1びょうは つづけて 減らない
    G.shake = 10;
    addFloater(p.x, p.y - 44, "-" + n, "#ff8f8f");
    Sfx.play("hurt");
    if (p.hp <= 0) {
      p.hp = 0;
      playerDown();
    }
  }

  function playerDown() {
    G.downT = 1.6; // これが 0 に なると 再かいし
    addFloater(G.player.x, G.player.y - 46, "たおれた…", "#ff8f8f");
    Sfx.play("down");
    // ★だれに やられたか かぞえる（Ph5 くじけない ための しくみ）
    const id = G.lastFoe;
    if (id) {
      G.deaths[id] = (G.deaths[id] || 0) + 1;
      easeIfStruggling(id);
    }
  }

  // =========================================================
  //  くじけない ための しくみ（Ph5）
  // =========================================================
  //  ★かんじんな ところ：
  //    やさしく する ほうは「じどう・だまって・味方が つよくなった ように」見せる。
  //    「てきが よわく なった」とは ぜったいに 言わない（要件D3・D4）。
  function easeIfStruggling(foeId) {
    const n = G.deaths[foeId] || 0;
    if (n < 2) return;
    const e = G.enemies.filter((x) => x.id === foeId)[0];
    if (e) {
      // てきを こっそり よわく する（画面には 出さない）
      e.maxHp = Math.max(4, Math.round(e.maxHp * 0.8));
      e.hp = e.maxHp;
      e.attack = Math.max(1, e.attack - 1);
      if (e.windupSec) e.windupSec = Math.min(2.4, e.windupSec + 0.2); // よける ゆうよを ふやす
    }
    if (n === 2) {
      // 2回目は 薬（ハートが 1つ ふえる）だけ。ことばは 出さない
      return;
    }
    // 3回目いこう：味方が つよく なった ように 見せる
    G.player.attack += 2;
    const msg = G.partner
      ? "ミィが 本気を だした！🔥"
      : G.fairy
      ? "ピカが おうえん して くれた！✨"
      : "リイコの けんが 光った！⚔️";
    setTimeout(() => {
      addFloater(G.player.x, G.player.y - 60, msg, "#ffe36b");
      Sfx.play("nice");
    }, 0);
  }

  // おたすけモード（手で えらぶ）… ヒントが 早く 出て、ハートが ふえる
  function setHelpMode(on) {
    G.helpMode = !!on;
    if (G.helpMode && G.player) {
      G.player.maxHp = Math.max(G.player.maxHp, 5);
      G.player.hp = G.player.maxHp;
    }
    saveGame();
  }

  function respawnPlayer() {
    const p = G.player;
    p.x = G.respawn.x;
    p.y = G.respawn.y;
    p.hp = p.maxHp;
    p.invT = 1.5;
    p.trail.length = 0;
    G.bullets = [];
    // てきは もとの ばしょへ もどす（たおした てきは たおしたまま）
    for (const e of G.enemies) {
      if (!e.alive) continue;
      e.x = e.home.x;
      e.y = e.home.y;
      e.hp = e.maxHp;
      e.knockT = 0;
    }
    if (G.partner) {
      G.partner.x = p.x - 44;
      G.partner.y = p.y + 26;
      G.partner.hp = G.partner.maxHp;
      G.partner.state = "follow";
      G.partner.target = null;
    }
  }

  // ---- こうしん（毎フレーム） ----
  function update(dt) {
    if (G.titleT > 0) G.titleT -= dt;
    if (G.cut) {
      updateCutscene(dt);
      updateCamera();
      return;
    }
    if (G.paused) return;
    // ★ヒットストップ：当たった しゅんかん だけ 世界を 止める
    if (G.hitstop > 0) {
      G.hitstop -= dt;
      return;
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);

    // やられて いる あいだ
    if (G.downT > 0) {
      G.downT -= dt;
      updateFloaters(dt);
      if (G.downT <= 0) respawnPlayer();
      return;
    }
    updatePlayer(dt);
    checkTriggers(); // ぶつかって発生するイベント
    updatePartner(dt);
    checkFairyJoin();
    if (G.fairy) updateFairy(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateFloaters(dt);
    updateStuck(dt);
    updateCamera();
  }

  function updatePlayer(dt) {
    const p = G.player;
    const prevX = p.x,
      prevY = p.y;

    // キーボード（パソコンで確認用）
    let kx = 0,
      ky = 0;
    if (G.keys["ArrowLeft"] || G.keys["a"]) kx -= 1;
    if (G.keys["ArrowRight"] || G.keys["d"]) kx += 1;
    if (G.keys["ArrowUp"] || G.keys["w"]) ky -= 1;
    if (G.keys["ArrowDown"] || G.keys["s"]) ky += 1;

    // 剣の タイマー
    if (p.atkT > 0) p.atkT -= dt;
    if (p.atkCd > 0) p.atkCd -= dt;
    if (p.invT > 0) p.invT -= dt;
    if (p.comboT > 0) {
      p.comboT -= dt;
      if (p.comboT <= 0) p.combo = 0; // 間が あいたら 1はつめに もどる
    }

    // 主人公は キーボード／ほうこうボタン だけで うごく
    if (kx || ky) {
      const len = Math.sqrt(kx * kx + ky * ky) || 1;
      p.dirX = kx / len; // むいている ほうを おぼえる（剣は こっちに 当たる）
      p.dirY = ky / len;
      // 剣を ふって いる あいだは すこし ゆっくり
      const sp = p.atkT > 0 ? p.speed * 0.45 : p.speed;
      p.x += (kx / len) * sp * dt;
      p.y += (ky / len) * sp * dt;
      resolveObstacles(p, PLAYER_R);
      advanceWalk(p, dt, kx, ky); // あるく絵の むき・コマ
    } else {
      advanceWalk(p, dt, 0, 0); // とまったら 立ちの 絵
    }

    p.x = clamp(p.x, 20, G.world.width - 20);
    p.y = clamp(p.y, 20, G.world.height - 20);

    // うごいたか？（ねこの追従につかう）
    const moved = dist(p.x, p.y, prevX, prevY);
    p.moving = moved > 0.4;

    // 通ったあとを記録（ねこが これを おいかける）
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 70) p.trail.shift();
  }

  // =========================================================
  //  面（ステージ）と きろく（Ph2）
  // =========================================================
  const SAVE_KEY = "riiko_save_v1";

  function saveGame() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          v: 1,
          stageId: G.stageId,
          flags: G.flags,
          talks: G.talks,
          items: G.items,
          opened: G.opened,
          defeated: G.defeated,
          respawn: G.respawn,
          helpMode: G.helpMode,
        })
      );
    } catch (e) {}
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.v === 1 && window.STAGES[d.stageId] ? d : null;
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  // 面を よみこんで はじめる
  function goToStage(id, opts) {
    const sc = window.STAGES[id];
    if (!sc) return false;
    G.stageId = id;
    setup(sc);
    if (opts && opts.respawn) {
      // セーブから もどす ときは 前の ばしょへ
      G.player.x = opts.respawn.x;
      G.player.y = opts.respawn.y;
      G.respawn = { x: opts.respawn.x, y: opts.respawn.y };
      // ★復帰地点が障害物にめり込んでいる場合は、安全な初期位置へ戻す（フェイルセーフ）
      if (!isSafePosition(G.player.x, G.player.y, PLAYER_R)) {
        G.player.x = sc.player.x;
        G.player.y = sc.player.y;
        G.respawn = { x: sc.player.x, y: sc.player.y };
      }
    }
    G.titleText = sc.title || "";
    G.titleT = 2.6; // 面の なまえを しばらく 出す
    madeProgress();
    saveGame();
    // ★面に 入った ときの 見せ場（1回だけ）
    if (sc.intro && !(sc.intro.once && G.flags[sc.intro.once])) {
      if (sc.intro.once) G.flags[sc.intro.once] = true;
      startCutscene(sc.intro.cutscene || sc.intro);
    }
    return true;
  }

  // 出口 → つぎの 面へ
  function goNextStage() {
    const sc = window.STAGES[G.stageId];
    const next = sc && sc.next;
    if (next && window.STAGES[next]) {
      goToStage(next);
    } else {
      Dialogue.open("おしまい", [
        "ここまで！ つづきは これから 作ります。",
        "あそんで くれて ありがとう！🎉",
      ]);
    }
  }

  // 出口が つかえるか（ボスの いない ステージでは requireBoss:false に する）
  function exitReady() {
    if (!G.exit) return false;
    return G.exit.requireBoss === false || G.bossDefeated;
  }

  // ---- ぶつかって発生するイベント（宝箱・会話・とびら・出口） ----
  function checkTriggers() {
    const p = G.player;

    // たからばこ（あけると アイテムが 手に入る）
    for (const c of G.chests) {
      if (!c.opened && dist(p.x, p.y, c.x, c.y) < PLAYER_R + 26) {
        c.opened = true;
        G.opened[c.id] = true;
        madeProgress();
        applySet(c);
        if (c.key) G.items[c.key] = (G.items[c.key] || 0) + 1;
        addFloater(c.x, c.y - 40, "たからばこ！", "#ffd76b");
        Sfx.play("chest");
        saveGame();
        Dialogue.open("たからばこ", [c.message]);
        return;
      }
    }

    // とびら（アイテムが そろうと あく。まだなら ヒントを出す）
    for (const g of G.gates) {
      if (g.open) continue;
      const have = G.items[g.requireKey] || 0;
      if (have >= g.requireCount) {
        g.open = true;
        G.obstacles = G.obstacles.filter((o) => o.gateId !== g.id);
        addFloater(g.x, g.y - 30, "ひらいた！✨", "#ffe36b");
        Sfx.play("solved");
        Dialogue.open("とびら", g.openLines || ["とびらが ひらいた！"]);
        return;
      }
      const near = dist(p.x, p.y, g.x, g.y) < (g.r || 40) + 26;
      if (near && !g._inside) {
        g._inside = true;
        const lines = (g.lockedLines || ["かたく とじている…"]).map((s) =>
          s.replace("{have}", have).replace("{need}", g.requireCount)
        );
        Dialogue.open("とびら", lines);
        return;
      }
      if (!near) g._inside = false;
    }

    // とうじょうじんぶつ（ヒントをくれる）
    //   ★ちかづきすぎ ないと 話しかけない。NPCごとに r で かえられる
    for (const n of G.npcs) {
      if (!condOk(n)) continue;
      const near = dist(p.x, p.y, n.x, n.y) < (n.r || NPC_TALK_R);
      if (near && !n._inside) {
        n._inside = true;
        G.talks[n.id] = (G.talks[n.id] || 0) + 1;
        applySet(n);
        Sfx.play("talk");
        Dialogue.open(n.name, pickLines(n));
        return;
      }
      if (!near) n._inside = false;
    }

    // ★通ると 何かが おきる ばしょ（カットシーン・フラグ）
    for (const t of G.triggers) {
      if (t._done && t.once !== false) continue;
      if (!condOk(t)) continue;
      const near = dist(p.x, p.y, t.x, t.y) < (t.r || 50);
      if (near && !t._inside) {
        t._inside = true;
        t._done = true;
        applySet(t);
        saveGame();
        // ★ほめる（大きな もじ＋音）… 止めない
        if (t.praise) {
          addFloater(p.x, p.y - 70, t.praise, "#ffe36b");
          Sfx.play(t.sfx || "solved");
        }
        // ★つぶやき（小さな もじ）… 止めない ので テンポが 落ちない
        if (t.mutter) addFloater(p.x, p.y - 46, t.mutter, "#dff");
        if (t.cutscene) startCutscene(t.cutscene);
        else if (t.lines) Dialogue.open(t.name || "", t.lines);
        return;
      }
      if (!near) t._inside = false;
    }

    // ★チェックポイント（やられた とき ここから)
    for (const c of G.checkpoints) {
      if (c._done) continue;
      if (dist(p.x, p.y, c.x, c.y) < (c.r || 50)) {
        c._done = true;
        madeProgress();
        G.respawn = { x: c.x, y: c.y };
        addFloater(c.x, c.y - 40, "ここから やりなおせるよ", "#9fd");
        saveGame();
      }
    }

    // 出口（ボスをたおすと つかえる。requireBoss:false なら いつでも つかえる）
    if (G.exit) {
      const near = dist(p.x, p.y, G.exit.x, G.exit.y) < (G.exit.r || 40);
      if (near && exitReady() && !G.exit._done) {
        G.exit._done = true;
        applySet(G.exit);
        G.exit._goNext = true; // かいわが おわったら つぎの 面へ
        Dialogue.open("しゅつぐち", G.exit.lines || ["つぎの ステージへ！"]);
        return;
      }
    }
  }

  // ---- あいぼう（ねこ）※いない ときは 何も しない ----
  function updatePartner(dt) {
    const pt = G.partner;
    if (!pt) return;
    pt.bob += dt * 6;
    pt.wanderT += dt;

    // つかれて休んでいる
    if (pt.state === "rest") {
      pt.restT -= dt;
      pt.hp = Math.min(pt.maxHp, pt.hp + pt.maxHp * dt * 0.5);
      followPlayer(pt, dt);
      if (pt.restT <= 0) {
        pt.hp = pt.maxHp;
        pt.state = "follow";
      }
      return;
    }

    // タップされた じめんへ 進む
    if (pt.state === "goto") {
      const d = dist(pt.x, pt.y, pt.gotoX, pt.gotoY);
      if (d < 12) {
        pt.state = "follow"; // ついたら また ついてくる
      } else {
        stepToward(pt, pt.gotoX, pt.gotoY, 240, dt, CAT_R, true);
      }
      return;
    }

    // 敵にむかって たたかう
    if (pt.state === "attack" && pt.target && pt.target.alive) {
      const e = pt.target;
      const d = dist(pt.x, pt.y, e.x, e.y);
      const range = 46;
      if (d > range) {
        // 障害物をよけて 敵へ近づく
        stepToward(pt, e.x, e.y, 230, dt, CAT_R, true);
      } else {
        pt.atkCd -= dt;
        if (pt.atkCd <= 0) {
          pt.atkCd = 0.7;
          const d2 = dist(pt.x, pt.y, e.x, e.y) || 1;
          hitEnemy(e, pt.attack, (e.x - pt.x) / d2, (e.y - pt.y) / d2);
        }
      }
      if (pt.hp <= 0) faint(pt);
      return;
    }

    // ふだん：しゅじんこうを 少しおくれて・少しはなれて おいかける
    if (pt.state !== "follow") pt.state = "follow";
    followPlayer(pt, dt);
  }

  function faint(pt) {
    pt.state = "rest";
    pt.restT = 3;
    pt.target = null;
    addFloater(pt.x, pt.y - 40, "つかれた…💤", "#9fd");
  }

  // ねこの おいかたり（おくれ・はなれ・ゆらぎ・止まると まわる）
  function followPlayer(pt, dt) {
    const p = G.player;

    if (p.moving) pt.idleT = 0;
    else pt.idleT += dt;

    let tx, ty;
    if (pt.idleT > 0.5) {
      // 主人公が 止まっているとき → まわりを ぐるぐる
      pt.orbitA += dt * (1.1 + Math.sin(pt.wanderT * 0.7) * 0.3);
      const r = 36 + Math.sin(pt.wanderT * 0.9) * 10;
      tx = p.x + Math.cos(pt.orbitA) * r;
      ty = p.y + Math.sin(pt.orbitA) * r * 0.7;
    } else {
      // うごいているとき → 通ったあとを 少しおくれて おいかける
      const idx = Math.max(0, p.trail.length - 16);
      const base = p.trail[idx] || p;
      const wx = Math.sin(pt.wanderT * 1.7) * 10 + Math.cos(pt.wanderT * 0.6) * 6;
      const wy = Math.cos(pt.wanderT * 1.3) * 10 + Math.sin(pt.wanderT * 0.8) * 6;
      tx = base.x + wx;
      ty = base.y + wy;
      // まわる角度を 今の位置に あわせておく（切りかわりを なめらかに）
      pt.orbitA = Math.atan2(pt.y - p.y, pt.x - p.x);
    }

    // 近いときは ゆっくり（自然なおくれ）、遠いときは 速く追いつく
    const dx = tx - pt.x,
      dy = ty - pt.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const deadzone = 6;
    if (d > deadzone) {
      const speed = Math.min(d * 4.2, 240);
      const step = Math.min(speed * dt, d);
      pt.x += (dx / d) * step;
      pt.y += (dy / d) * step;
      resolveObstacles(pt, CAT_R);
    }
  }

  // ---- てき ----
  function updateEnemies(dt) {
    const pt = G.partner;
    const p = G.player;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      e.phase += dt * 4;
      if (e.flashT > 0) e.flashT -= dt;
      if (e.touchCd > 0) e.touchCd -= dt;
      e.attackedT += dt; // こうげきして から の 時間（ジャスト反げき用）

      // 斬られて うしろに さがる
      if (e.knockT > 0) {
        e.knockT -= dt;
        e.x += e.knockX * dt;
        e.y += e.knockY * dt;
        e.knockX *= 0.86;
        e.knockY *= 0.86;
        resolveObstacles(e, ENEMY_R);
      }

      // かかしは うごかない・こうげきしない
      if (e.dummy) continue;

      // リイコに ぶつかると ダメージ
      //   ★目を まわして いる あいだは あんぜん（せっかくの チャンスなので）
      if (e.chargeState === "dizzy") e.touchCd = Math.max(e.touchCd, 0.2);
      if (dist(e.x, e.y, p.x, p.y) < PLAYER_R + ENEMY_R && e.touchCd <= 0) {
        e.touchCd = 1.0;
        e.attackedT = 0; // ★この あと 0.45びょうが ジャスト反げきの チャンス
        G.lastFoe = e.id; // やられた とき「だれに」を おぼえる
        damagePlayer(e.attack);
      }

      const engaged =
        !!pt &&
        pt.state === "attack" &&
        pt.target === e &&
        dist(pt.x, pt.y, e.x, e.y) <= 52;

      if (engaged) {
        // せっきん戦：うごかず はんげき
        advanceWalk(e, dt, 0, 0);
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = 1.0;
          pt.hp -= e.attack;
          addFloater(pt.x, pt.y - 38, "-" + e.attack, "#ff8f8f");
          if (pt.hp <= 0) faint(pt);
        }
      } else {
        const px = e.x,
          py = e.y;
        moveEnemy(e, dt, p);
        // じっさいに うごいた 向きから むきと コマを きめる
        advanceWalk(e, dt, e.x - px, e.y - py);
      }

      // 弾を撃つタイプ（せっきん戦でも 撃つ）
      if (e.behavior === "shooter") updateShooter(e, dt, p);
    }
  }

  function moveEnemy(e, dt, p) {
    if (e.behavior === "chase") {
      const d = dist(e.x, e.y, p.x, p.y);
      if (d < (e.sight || 240)) {
        stepToward(e, p.x, p.y, e.speed || 50, dt, ENEMY_R, true);
      } else {
        stepToward(e, e.home.x, e.home.y, (e.speed || 50) * 0.6, dt, ENEMY_R, true);
      }
    } else if (e.behavior === "patrol") {
      const r = e.patrolRange || 80;
      const tx = e.home.x + Math.sin(e.phase * 0.5) * r;
      const ty = e.home.y + Math.cos(e.phase * 0.35) * r * 0.5;
      stepToward(e, tx, ty, e.speed || 35, dt, ENEMY_R, true);
    } else if (e.behavior === "shooter") {
      const tx = e.home.x + Math.sin(e.phase * 0.3) * 20;
      const ty = e.home.y + Math.cos(e.phase * 0.3) * 20;
      stepToward(e, tx, ty, e.speed || 18, dt, ENEMY_R, false);
    } else if (e.behavior === "charge") {
      moveCharger(e, dt, p);
    }
  }

  // ---- 突進ネコ ----
  //   ためる → まっすぐ とつげき → かべに ぶつかって 目を まわす
  //   ★目を まわして いる あいだが チャンス（ダメージ 2ばい）
  function moveCharger(e, dt, p) {
    e.chargeT -= dt;

    if (e.chargeState === "wait") {
      // うろうろ しながら リイコを さがす
      const r = 40;
      const tx = e.home.x + Math.sin(e.phase * 0.4) * r;
      const ty = e.home.y + Math.cos(e.phase * 0.3) * r * 0.6;
      stepToward(e, tx, ty, (e.speed || 60) * 0.4, dt, ENEMY_R, true);
      if (e.chargeT <= 0 && dist(e.x, e.y, p.x, p.y) < (e.sight || 260)) {
        e.chargeState = "windup";
        e.chargeT = e.windupSec || 0.8; // ためる 時間（よける ための ゆうよ）
      }
      return;
    }

    if (e.chargeState === "windup") {
      // その場で ぷるぷる。
      // ★ねらいを さだめるのは 前半だけ。後半は もう 向きを かえない。
      //   （さいごまで 追いかけると、どこへ にげても 当たって しまう）
      const aimUntil = (e.windupSec || 0.8) * (1 - (e.aimRatio == null ? 0.45 : e.aimRatio));
      if (e.chargeT > aimUntil) {
        const d = dist(e.x, e.y, p.x, p.y) || 1;
        e.dashX = (p.x - e.x) / d;
        e.dashY = (p.y - e.y) / d;
      }
      if (e.chargeT <= 0) {
        e.chargeState = "dash";
        e.chargeT = e.dashSec || 1.1;
        Sfx.play("dash");
      }
      return;
    }

    if (e.chargeState === "dash") {
      // まっすぐ 走る（よけない＝だから よけられる）
      const sp = e.dashSpeed || 300;
      const bx = e.x,
        by = e.y;
      e.x += e.dashX * sp * dt;
      e.y += e.dashY * sp * dt;
      resolveObstacles(e, ENEMY_R);
      const moved = dist(e.x, e.y, bx, by);
      // かべに ぶつかった（思ったより すすめなかった）or 時間ぎれ
      if (moved < sp * dt * 0.5 || e.chargeT <= 0) {
        e.chargeState = "dizzy";
        e.chargeT = e.dizzySec || 1.8;
        addFloater(e.x, e.y - 40, "目が まわる…💫", "#9fd");
        Sfx.play("dizzy");
      }
      return;
    }

    // dizzy：うごかない。ここを たたく のが 正かい
    if (e.chargeT <= 0) {
      e.chargeState = "wait";
      e.chargeT = e.restSec || 1.2;
    }
  }

  function updateShooter(e, dt, p) {
    e.shootCd -= dt;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < (e.sight || 320) && e.shootCd <= 0) {
      e.shootCd = e.shootInterval || 1.8;
      const dx = p.x - e.x,
        dy = p.y - e.y;
      const dd = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = e.bulletSpeed || 140;
      G.bullets.push({
        x: e.x,
        y: e.y,
        vx: (dx / dd) * sp,
        vy: (dy / dd) * sp,
        dmg: e.bulletDamage || 3,
        life: 4,
      });
    }
  }

  function defeatEnemy(e) {
    e.alive = false;
    if (e.remember) G.defeated[e.id] = true; // remember:true の てきは 生きかえらない
    madeProgress();
    applySet(e);
    addFloater(e.x, e.y - 30, "たおした！✨", "#ffe36b");
    Sfx.play("defeat");
    if (G.partner) {
      G.partner.target = null;
      G.partner.state = "follow";
    }

    if (e.id === "boss") {
      G.bossDefeated = true;
      setTimeout(() => {
        Dialogue.open("しま", [
          "ボスネコを たおした！",
          "うえに 光る とびらが あらわれた…",
          "ちかづくと つぎの ステージへ いけそうだ！🎉",
        ]);
      }, 500);
    }
  }

  // ---- 弾 ----
  function updateBullets(dt) {
    const pt = G.partner;
    for (const b of G.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // あいぼうに当たる（主人公には当たらない＝やさしい設計）
      if (pt && pt.state !== "rest" && dist(b.x, b.y, pt.x, pt.y) < CAT_R + 8) {
        pt.hp -= b.dmg;
        addFloater(pt.x, pt.y - 38, "-" + b.dmg, "#ff8f8f");
        b.life = 0;
        if (pt.hp <= 0) faint(pt);
        continue;
      }
      // 障害物に当たったら 消える
      for (const o of G.obstacles) {
        if (dist(b.x, b.y, o.x, o.y) < o.r) {
          b.life = 0;
          break;
        }
      }
    }
    G.bullets = G.bullets.filter(
      (b) =>
        b.life > 0 &&
        b.x > -20 &&
        b.y > -20 &&
        b.x < G.world.width + 20 &&
        b.y < G.world.height + 20
    );
  }

  function updateFloaters(dt) {
    for (const f of G.floaters) {
      f.y -= 28 * dt;
      f.life -= dt;
    }
    G.floaters = G.floaters.filter((f) => f.life > 0);
  }

  function updateCamera() {
    const p = G.player;
    const look = cutCamTarget();
    const fx = look ? look.x : p.x;
    const fy = look ? look.y : p.y;
    let cx = fx - viewW / 2;
    let cy = fy - viewH / 2;
    // ★カットシーンの ときは 世界の そとまで カメラを 出せる
    //   （しろは 世界の いちばん 上に あるので、そうしないと 見せ場に ならない）
    if (!look) {
      if (G.world.width > viewW) cx = clamp(cx, 0, G.world.width - viewW);
      else cx = (G.world.width - viewW) / 2;
      if (G.world.height > viewH) cy = clamp(cy, 0, G.world.height - viewH);
      else cy = (G.world.height - viewH) / 2;
      G.cam.x = cx;
      G.cam.y = cy;
    } else {
      // カットシーンでは すこしずつ 近づく（ぱっと 飛ばない）
      G.cam.x += (cx - G.cam.x) * 0.06;
      G.cam.y += (cy - G.cam.y) * 0.06;
    }
  }

  // ---- びょうが ----
  function draw() {
    // ★画面の ゆれ（当たった とき・ダメージを うけた とき）
    let sx = 0,
      sy = 0;
    if (G.shake > 0) {
      const t = G.shake;
      sx = Math.sin(t * 3.1) * t * 0.5;
      sy = Math.cos(t * 2.3) * t * 0.5;
    }
    const ox = -G.cam.x + sx,
      oy = -G.cam.y + sy;

    ctx.fillStyle = G.world.ground || "#8fca7a";
    ctx.fillRect(0, 0, viewW, viewH);
    drawAreas(ox, oy); // あるける じめん（マップ作成ツールで ぬった ところ）
    drawGrid();

    // 画面の外にあるものは えがかない（木がたくさんあっても かるく動く）
    const onScreen = (x, y, m) =>
      x + ox > -m && x + ox < viewW + m && y + oy > -m && y + oy < viewH + m;

    // かざり（ぶつからない）。size を 書くと 大きさを かえられる。
    //   ※木と おなじ 大きさ(44)に すると「通り抜けできる森」が 作れる。
    for (const d of G.decorations) {
      if (onScreen(d.x, d.y, 40)) Assets.drawDeco(ctx, d.sprite, d.x + ox, d.y + oy, d.size || 30);
    }

    // しょうがいぶつ（かげ＋絵）
    for (const o of G.obstacles) {
      if (!onScreen(o.x, o.y, 60)) continue;
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(o.x + ox, o.y + oy + o.r * 0.5, o.r, o.r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000"; // かげの うすい色を もどす（絵文字が うすくならないように）
      Assets.drawPart(ctx, o.sprite, o.x + ox, o.y + oy, o.r);
    }

    for (const c of G.chests) {
      if (onScreen(c.x, c.y, 40))
        drawSprite(c.opened ? "📭" : "🎁", c.x + ox, c.y + oy, 34);
    }

    // とびら
    for (const g of G.gates) {
      if (!onScreen(g.x, g.y, 60)) continue;
      drawSprite("🚪", g.x + ox, g.y + oy, 42);
      if (!g.open) drawSprite("🔒", g.x + ox, g.y + oy - 30, 22);
    }

    // 出口（つぎのステージへ。ボスをたおすと 光る）
    if (G.exit && onScreen(G.exit.x, G.exit.y, 60)) {
      ctx.globalAlpha = exitReady() ? 1 : 0.4;
      drawSprite("⛩️", G.exit.x + ox, G.exit.y + oy, 48);
      ctx.globalAlpha = 1;
      drawNameTag(G.exit.label || "つぎのステージへ", G.exit.x + ox, G.exit.y + oy - 36);
    }

    for (const n of G.npcs) {
      if (!onScreen(n.x, n.y, 40)) continue;
      drawSprite(n.sprite, n.x + ox, n.y + oy, 38);
      drawNameTag(n.name, n.x + ox, n.y + oy - 34);
    }

    // カットシーンに だけ 出る 人
    for (const a of G.actors) {
      if (!onScreen(a.x, a.y, 60)) continue;
      if (!drawWalker(a, a.x + ox, a.y + oy, 0)) drawSprite(a.sprite, a.x + ox, a.y + oy, a.size || 44);
      if (a.name) drawNameTag(a.name, a.x + ox, a.y + oy - (a.size || 44) * 0.6);
    }

    for (const e of G.enemies) {
      if (!e.alive) continue;
      const bob = Math.sin(e.phase) * 3;
      // 斬られた しゅんかん 白く 光る
      if (e.flashT > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(e.x + ox, e.y + oy + bob, 24, 0, Math.PI * 2);
        ctx.fill();
      }
      // ★突進ネコ：いま 何を して いるか 見て わかるように する
      let ex = e.x,
        ey = e.y;
      if (e.behavior === "charge" && e.chargeState === "windup") {
        ex += Math.sin(e.phase * 9) * 4; // ぷるぷる ためて いる
      }
      let top = 32; // HPバー・なまえを 出す たかさ（頭の うえ）
      if (drawWalker(e, ex + ox, ey + oy, bob)) top = e.size * 0.5 + 6;
      else drawSprite(e.sprite, ex + ox, ey + oy + bob, 40);
      if (e.behavior === "charge") {
        if (e.chargeState === "windup") {
          drawSprite("❗", ex + ox, ey + oy - top - 14, 30); // 「くるぞ！」
        } else if (e.chargeState === "dizzy") {
          const a = e.phase * 3;
          drawSprite("💫", ex + ox + Math.cos(a) * 14, ey + oy - top - 10, 26);
        }
      }
      if (!e.dummy) drawHpBar(ex + ox, ey + oy - top, e.hp, e.maxHp, "#ff6b6b");
      else drawNameTag(e.name || "かかし", ex + ox, ey + oy - top);
    }

    // 弾
    for (const b of G.bullets) {
      ctx.fillStyle = "#ff5a5a";
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y + oy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // あいぼう（いない ときは えがかない）
    const pt = G.partner;
    if (pt) {
      const ptBob = Math.sin(pt.bob) * 2;
      drawSprite(pt.sprite, pt.x + ox, pt.y + oy + ptBob, 34);
      drawHpBar(pt.x + ox, pt.y + oy - 28, pt.hp, pt.maxHp, "#69c56b");
      if (pt.state === "rest") drawSprite("💤", pt.x + ox + 18, pt.y + oy - 24, 18);
    }

    // ---- しゅじんこう（剣を ふる 見た目つき）----
    const pl = G.player;
    // 剣：むいている ほうに 弧を えがく
    if (pl.atkT > 0) {
      const prog = 1 - pl.atkT / 0.18; // 0→1
      const base = Math.atan2(pl.dirY, pl.dirX);
      const a0 = base - 1.0 + prog * 2.0;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(pl.x + ox, pl.y + oy, SWORD_REACH * 0.8, a0 - 0.5, a0 + 0.5);
      ctx.stroke();
      drawSprite(
        "🗡️",
        pl.x + ox + Math.cos(a0) * SWORD_REACH * 0.7,
        pl.y + oy + Math.sin(a0) * SWORD_REACH * 0.7,
        30
      );
    }
    // むてき中は ちかちかさせる
    if (G.downT > 0) ctx.globalAlpha = 0.5;
    else if (pl.invT > 0) ctx.globalAlpha = Math.sin(pl.invT * 30) > 0 ? 0.35 : 1;
    // あるく絵。まだ よみこめて いなければ 絵文字で あそべる
    if (!drawWalker(pl, pl.x + ox, pl.y + oy, 0)) {
      drawSprite(pl.sprite, pl.x + ox, pl.y + oy, 42);
    }
    ctx.globalAlpha = 1;

    drawFairy(ox, oy); // 仲間1 ピカ
    drawGuide(ox, oy); // ヒント3の 光る しるし

    for (const f of G.floaters) {
      ctx.globalAlpha = clamp(f.life / 0.9, 0, 1);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x + ox, f.y + oy);
      ctx.fillText(f.text, f.x + ox, f.y + oy);
      ctx.globalAlpha = 1;
    }

    drawHud();
    drawDown();
    drawStageTitle();
  }

  // 面の はじめに なまえを ふわっと 出す
  function drawStageTitle() {
    if (G.titleT <= 0 || !G.titleText) return;
    const a = G.titleT > 2.1 ? (2.6 - G.titleT) / 0.5 : Math.min(1, G.titleT / 0.7);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, viewH / 2 - 52, viewW, 104);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(G.titleText, viewW / 2, viewH / 2);
    ctx.globalAlpha = 1;
  }

  // 左上：ハート（リイコの げんき）
  function drawHearts() {
    const p = G.player;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "26px system-ui, 'Segoe UI Emoji', sans-serif";
    for (let i = 0; i < p.maxHp; i++) {
      ctx.globalAlpha = i < p.hp ? 1 : 0.28;
      ctx.fillText(i < p.hp ? "❤️" : "🤍", 14 + i * 30, 26);
    }
    ctx.globalAlpha = 1;
  }

  // やられた ときの 表示
  function drawDown() {
    if (G.downT <= 0) return;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("たおれた…", viewW / 2, viewH / 2 - 16);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("すぐ もどるよ！", viewW / 2, viewH / 2 + 26);
  }

  // ヒント3：行き先を 光らせる。画面の そとなら へりに やじるしを 出す
  function drawGuide(ox, oy) {
    if (!G.guide) return;
    const gx = G.guide.x + ox,
      gy = G.guide.y + oy;
    const puls = 1 + Math.sin(G.guideT * 5) * 0.18;
    if (gx > 20 && gx < viewW - 20 && gy > 20 && gy < viewH - 20) {
      // 画面の 中に ある → 光る わ
      ctx.strokeStyle = "rgba(255,235,120,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gx, gy, 34 * puls, 0, Math.PI * 2);
      ctx.stroke();
      drawSprite("✨", gx, gy - 44, 26);
    } else {
      // 画面の そと → へりに やじるし
      const cx = viewW / 2,
        cy = viewH / 2;
      const dx = gx - cx,
        dy = gy - cy;
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min((viewW / 2 - 46) / Math.abs(dx || 1), (viewH / 2 - 46) / Math.abs(dy || 1));
      const ax = cx + dx * m,
        ay = cy + dy * m;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = "rgba(255,235,120,0.95)";
      ctx.beginPath();
      ctx.moveTo(18 * puls, 0);
      ctx.lineTo(-12, -11);
      ctx.lineTo(-12, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      void d;
    }
  }

  // 右上：やみの しろ まで あと 何めん か（原則A：目あてが いつも 見えている）
  function drawGoal() {
    const order = window.STAGE_ORDER || [];
    const i = order.indexOf(G.stageId);
    if (i < 0) return;
    const left = order.length - 1 - i;
    const text = left > 0 ? "🏰 やみのしろ まで あと " + left + "めん" : "🏰 やみのしろ";
    ctx.font = "bold 18px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(viewW - 12 - w, 12, w, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, viewW - 23, 29);
  }

  // あつめたアイテムの かず（とびらの じょうけん）を 左上に表示
  function drawHud() {
    drawHearts();
    drawGoal();
    const g = G.gates[0];
    if (!g || g.open) return;
    const have = G.items[g.requireKey] || 0;
    const text = (g.hudIcon || "🔮") + " " + have + " / " + g.requireCount;
    ctx.font = "bold 22px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 26;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(12, 12, w, 38, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, 25, 32);
  }

  // あるける じめんを 色ちがいで ぬる（world.areas がある ときだけ）
  function drawAreas(ox, oy) {
    const areas = (G.world && G.world.areas) || [];
    for (const a of areas) {
      ctx.fillStyle = a.color || "#8fca7a";
      if (a.shape === "circle") {
        if (a.x + a.r + ox < 0 || a.x - a.r + ox > viewW) continue;
        if (a.y + a.r + oy < 0 || a.y - a.r + oy > viewH) continue;
        ctx.beginPath();
        ctx.arc(a.x + ox, a.y + oy, a.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        if (a.x + a.w + ox < 0 || a.x + ox > viewW) continue;
        if (a.y + a.h + oy < 0 || a.y + oy > viewH) continue;
        roundRect(a.x + ox, a.y + oy, a.w, a.h, Math.min(18, a.w / 2, a.h / 2));
        ctx.fill();
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const size = 64;
    const startX = -(((G.cam.x % size) + size) % size);
    const startY = -(((G.cam.y % size) + size) % size);
    ctx.beginPath();
    for (let x = startX; x < viewW; x += size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
    }
    for (let y = startY; y < viewH; y += size) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
    }
    ctx.stroke();
  }

  // あるく絵で えがく。まだ よみこめて いなければ false を かえす
  //   絵は 128×128 の 正方形で、キャラが 下に そろえて 入っています。
  //   なので (x, y) を まん中に して そのまま おけば ちょうど よい イチに なります。
  //   bob … ふわふわ うかせる ぶん（かげは じめんに のこす）
  function drawWalker(ent, x, y, bob) {
    const set = ent.walk && ent.walk[ent.dir];
    const img = set && set[ent.frame];
    if (!img || !img.complete || !img.naturalWidth) return false;

    const s = ent.size;
    const footY = y - s / 2 + s * WALK_FOOT; // 足のうらの たかさ

    // 足もとの かげ（ほかの しょうがいぶつと 同じ かんじ）
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(x, footY - 2, s * 0.22, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000"; // かげの うすい色を もどす（このあとの 絵文字が うすくならないように）

    ctx.drawImage(img, x - s / 2, y - s / 2 + (bob || 0), s, s);
    return true;
  }

  function drawSprite(sprite, x, y, size) {
    ctx.font = size + "px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sprite, x, y);
  }

  function drawHpBar(x, y, hp, maxHp, color) {
    const w = 40,
      h = 6;
    const ratio = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#444";
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * ratio, h);
  }

  function drawNameTag(name, x, y) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(name).width + 12;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(x - w / 2, y - 9, w, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(name, x, y);
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

  // ---- メインループ ----
  function loop(ts) {
    if (!G.running) return;
    const dt = Math.min((ts - G.last) / 1000 || 0, 0.05);
    G.last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- かいわウィンドウ ----
  const Dialogue = {
    box: document.getElementById("dialogue"),
    nameEl: document.getElementById("dialogue-name"),
    textEl: document.getElementById("dialogue-text"),
    lines: [],
    idx: 0,
    open(name, lines, onClose) {
      this.lines = lines;
      this.idx = 0;
      this.onClose = onClose || null;
      this.nameEl.textContent = name;
      this.textEl.textContent = lines[0];
      this.box.classList.remove("hidden");
      G.paused = true;
    },
    advance() {
      this.idx++;
      if (this.idx >= this.lines.length) this.close();
      else this.textEl.textContent = this.lines[this.idx];
    },
    close() {
      this.box.classList.add("hidden");
      G.paused = false;
      const cb = this.onClose;
      this.onClose = null;
      if (cb) cb();
      // 出口の かいわが おわったら つぎの 面へ
      if (G.exit && G.exit._goNext) {
        G.exit._goNext = false;
        goNextStage();
      }
    },
  };
  Dialogue.box.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
    Dialogue.advance();
  });

  // ---- 入力イベント ----
  function bindInput() {
    canvas.addEventListener(
      "pointerdown",
      (ev) => handlePointer(ev.clientX, ev.clientY, true),
      { passive: false }
    );
    canvas.addEventListener("pointermove", (ev) => {
      if (ev.buttons) handlePointer(ev.clientX, ev.clientY, false);
    });
    window.addEventListener("keydown", (e) => {
      const isAction = e.key === "j" || e.key === "J" || e.key === " ";
      // ★かいわ中は スペース／エンター／J で「つぎへ」
      if (G.paused && (isAction || e.key === "Enter")) {
        e.preventDefault();
        if (!G.keys["_sword"]) Dialogue.advance();
        G.keys["_sword"] = true;
        return;
      }
      // 剣：J か スペース
      if (isAction) {
        e.preventDefault();
        if (!G.keys["_sword"]) swingSword(); // おしっぱなしでは 連打しない
        G.keys["_sword"] = true;
        return;
      }
      G.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "j" || e.key === "J" || e.key === " " || e.key === "Enter") {
        G.keys["_sword"] = false;
        return;
      }
      G.keys[e.key] = false;
    });

    // ヒントボタン（ピカが 仲間に なったら 出る）
    const hb = document.getElementById("btn-hint");
    if (hb) {
      hb.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // 押したら いまの こまり具合より 1つ こい ヒントを 出す
        const lv = Math.min(3, Math.max(1, G.hintLv + 1));
        if (showHint(lv)) G.hintLv = lv;
      });
    }

    // おたすけボタン（こまった とき。ヒントが 早く 出て ハートが ふえる）
    const help = document.getElementById("btn-help");
    if (help) {
      help.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setHelpMode(!G.helpMode);
        help.classList.toggle("on", G.helpMode);
        addFloater(
          G.player.x,
          G.player.y - 60,
          G.helpMode ? "おたすけモード オン！" : "おたすけモード オフ",
          "#9fd"
        );
        Sfx.play("talk");
      });
    }

    // 剣ボタン（画面）
    const sb = document.getElementById("btn-sword");
    if (sb) {
      sb.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        sb.classList.add("pressed");
        swingSword();
      });
      const off = () => sb.classList.remove("pressed");
      sb.addEventListener("pointerup", off);
      sb.addEventListener("pointercancel", off);
      sb.addEventListener("pointerleave", off);
    }
  }

  let inputBound = false;

  // ---- そとから呼ぶ ----
  window.RiikoGame = {
    // scenario を そのまま わたす（テスト用）／なにも わたさないと STAGES から はじめる
    start(scenario, opts) {
      resize();
      Sfx.warmUp(); // スタートボタンを おした ながれで 音を つかえるように する
      const cont = opts && opts.continue;

      if (scenario && typeof scenario === "object") {
        // 1つの 面だけ うごかす（テストや ためし用）
        G.flags = {};
        G.talks = {};
        G.items = {};
        G.opened = {};
        G.defeated = {};
        G.stageId = null;
        setup(scenario);
        G.titleText = scenario.title || "";
        G.titleT = 2.6;
      } else {
        const targetStage = typeof scenario === "string" ? scenario : null;
        const save = cont ? loadSave() : null;
        if (save && (!targetStage || save.stageId === targetStage)) {
          G.flags = save.flags || {};
          G.talks = save.talks || {};
          G.items = save.items || {};
          G.opened = save.opened || {};
          G.defeated = save.defeated || {};
          G.helpMode = !!save.helpMode;
          goToStage(save.stageId, { respawn: save.respawn });
        } else {
          if (!targetStage) clearSave();
          G.flags = {};
          G.talks = {};
          G.items = {};
          G.opened = {};
          G.defeated = {};
          goToStage(targetStage || window.FIRST_STAGE || "stage1");
        }
      }

      if (!inputBound) {
        bindInput();
        inputBound = true;
      }
      G.running = true;
      G.last = performance.now();
      requestAnimationFrame(loop);

      const hint = document.getElementById("hint");
      if (hint) setTimeout(() => (hint.style.opacity = "0"), 5000);
    },
    // ステージ一覧（スタート画面の選択肢用）
    getStageList() {
      const order = window.STAGE_ORDER || ["stage1", "stage2", "stage3", "stage4"];
      const list = [];
      for (const id of order) {
        const sc = window.STAGES && window.STAGES[id];
        if (sc) {
          list.push({ id: id, title: sc.title || id });
        }
      }
      return list;
    },
    // セーブの概要（スタート画面の「つづきから」表示用）
    getSaveInfo() {
      const s = loadSave();
      if (!s) return null;
      const sc = window.STAGES && window.STAGES[s.stageId];
      return { stageId: s.stageId, title: (sc && sc.title) || s.stageId };
    },
    stop() {
      G.running = false;
    },
    // つづきが あるか（スタート画面で つかう）
    hasSave: () => !!loadSave(),
    eraseSave: () => clearSave(),
    setHelpMode: (v) => setHelpMode(v),
    isHelpMode: () => G.helpMode,
    // テスト用：手動で1フレーム進める／状態をのぞく（ふだんは使いません）
    _test: {
      state: G,
      step: (dt) => {
        update(dt);
        draw();
      },
      tapEnemy: (x, y) => {
        const e = findEnemyAt(x, y);
        if (e) commandCat(e);
        return e ? e.id : null;
      },
      catTo: (x, y) => commandCatMove(x, y),
      press: (key, down) => {
        G.keys[key] = down;
      },
      swing: () => swingSword(),
      face: (x, y) => {
        const d = Math.hypot(x, y) || 1;
        G.player.dirX = x / d;
        G.player.dirY = y / d;
      },
      hurt: (n) => damagePlayer(n || 1),
      combo: () => G.player.combo,
      save: () => saveGame(),
      load: () => loadSave(),
      erase: () => clearSave(),
      goStage: (id) => goToStage(id),
      cutscene: (cs) => startCutscene(cs),
      hint: (lv) => showHint(lv || 1),
      helpMode: (v) => setHelpMode(v),
      fairySay: (t) => speakFairy(t, 3),
      killedBy: (id) => { G.lastFoe = id; },
      stuck: (sec) => { G.stuckT = sec; },
    },
  };
})();
