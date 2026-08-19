// ゲーム本体（engine + あたらしい scenario）を Node で うごかして たしかめる
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const drawn = [];
const rects = [];
const ctxTarget = {
  measureText: () => ({ width: 10 }),
  // どんな「ぬり色」「こさ」で かいたかも おぼえる（うすくなっていないか しらべる ため）
  fillText: (t, x, y) => drawn.push({ t, x, y, style: ctxTarget.fillStyle, alpha: ctxTarget.globalAlpha }),
  fillRect: (x, y, w, h) => rects.push({ x, y, w, h }),
};
const ctxStub = new Proxy(ctxTarget, {
  get: (t, k) => (k in t ? t[k] : () => {}),
  set: (t, k, v) => ((t[k] = v), true),
});

function mkEl(id) {
  const L = {};
  return {
    id,
    style: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; if (v) this._s.add(c); else this._s.delete(c); return v; } },
    addEventListener: (t, fn) => ((L[t] = L[t] || []).push(fn)),
    dispatch: (t, ev) => (L[t] || []).forEach((f) => f(ev)),
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    textContent: "",
    width: 0,
    height: 0,
    querySelectorAll: () => [],
  };
}
const els = {};
global.document = { getElementById: (id) => (els[id] = els[id] || mkEl(id)), querySelectorAll: () => [] };
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.window = { addEventListener: () => {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
// Node には 画像が ないので、から の 画像を かえす（＝絵文字で えがかれる）
global.Image = function () { this.complete = false; this.naturalWidth = 0; };
global.localStorage = (function () { const m = {}; return {
  getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => (m[k] = String(v)),
  removeItem: (k) => delete m[k] }; })();
global.AudioContext = undefined; // 音も Node では 出さない

// パーツの 絵の 一らん（Node には 画像が ないので 絵文字で えがかれる）
eval(fs.readFileSync(path.join(ROOT, "js/assets-data.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/assets.js"), "utf8"));
global.Assets = global.window.Assets;
eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
global.MapData = global.window.MapData;
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8") + ";global.GAME_CONFIG = GAME_CONFIG;");
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
global.SCENARIO = global.window.STAGES.stage1;
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);

ok("シナリオが 組み立つ", typeof SCENARIO === "object" && !!SCENARIO.world);
ok("あいことばは そのまま", GAME_CONFIG.password === "neko");
ok("木＋いわ＋かべ", SCENARIO.obstacles.length === 705, SCENARIO.obstacles.length + "こ");
ok("じめんの 色わけデータが ある", SCENARIO.world.areas.length === 18 && !!SCENARIO.world.areas[0].color);
ok("かざり 32こ（抜け道の 木を ふくむ）", SCENARIO.decorations.length === 32);
ok("てき6（かかし2をふくむ）・たからばこ2・NPC4",
  SCENARIO.enemies.length === 6 && SCENARIO.chests.length === 2 && SCENARIO.npcs.length === 4);

const G = window.RiikoGame;
G.start(SCENARIO);
const st = G._test.state;
ok("ゲームが はじまる", st.running === true);
ok("1面に とびらは ない", SCENARIO.gates.length === 0 && st.obstacles.length === 705, st.obstacles.length);

// 1フレーム えがく
drawn.length = 0;
rects.length = 0;
G._test.step(0.016);
ok("がめんに 木が えがかれる", drawn.filter((d) => d.t === "🌳").length > 0, drawn.filter((d) => d.t === "🌳").length + "本");
ok("しゅじんこうが えがかれる", drawn.some((d) => d.t === "👧"));
// ★1面は リイコ ひとり（ミィは 3面で 加わる）
ok("1面に 仲間は いない", st.partner === null);
ok("あいぼうねこは えがかれない", !drawn.some((d) => d.t === "🐱"));
ok("仲間が いなくても タップで エラーに ならない", (function () {
  try { G._test.catTo(700, 2200); G._test.tapEnemy(870, 2250); G._test.step(1 / 60); return true; }
  catch (e) { return false; }
})());

// 木・たからばこ・キャラが うすくならない（かげの 色が のこらない）
//   ⛩️（ボスまえは うすい）と 面の なまえ（ふわっと 出る）は のぞく
const fadeOk = ["⛩️", SCENARIO.title];
const usui = drawn.filter(
  (d) =>
    fadeOk.indexOf(d.t) < 0 &&
    ((d.alpha !== undefined && d.alpha < 1) || /rgba\([^)]*0\.\d+\)/.test(String(d.style)))
);
ok("絵が 半とうめいに ならない", usui.length === 0,
  usui.length ? usui[0].t + " が " + usui[0].style + " / alpha " + usui[0].alpha : "ぜんぶ くっきり");

// かいわを とじる（スタート地点で おばあさんが 話しかけてくる）
function closeDialogue() {
  for (let i = 0; i < 30 && st.paused; i++)
    els["dialogue"].dispatch("pointerdown", { stopPropagation() {} });
}
// スタート直後は しずか（いきなり かいわ まどが 出ない）
ok("スタート直後は かいわ まどが 出ない", st.paused === false);
// おばあさんの ところまで あるくと 話しかけてくる
// すこし はなれて いる あいだは 話しかけて こない（当たり判定を せまく した）
st.player.x = 545;
st.player.y = 2120;
G._test.step(0.016);
ok("すこし はなれて いれば 話しかけて こない", st.paused === false, "きょり 45");
// ちかづくと 話しかけてくる
st.player.x = 512;
st.player.y = 2122;
G._test.step(0.016);
ok("ちかづくと 話しかけてくる", st.paused === true, "きょり 12");
closeDialogue();
ok("かいわを とじられる", st.paused === false);

// うごく（うえへ）
const p = st.player;
const y0 = p.y;
G._test.press("ArrowUp", true);
for (let i = 0; i < 30; i++) {
  G._test.step(0.05);
  closeDialogue();
}
G._test.press("ArrowUp", false);
ok("うえに あるける", p.y < y0 - 100, Math.round(y0) + " → " + Math.round(p.y));
ok("木に めりこまない",
  !st.obstacles.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 18 - 0.5));

// よこは 森の かべで とまる（村の ひろばは x 360〜1040）
st.player.x = 700;
st.player.y = 2200;
G._test.press("ArrowRight", true);
for (let i = 0; i < 120; i++) {
  G._test.step(0.05);
  closeDialogue();
}
G._test.press("ArrowRight", false);
ok("森の かべで とまる", p.x < 1120, "x " + Math.round(p.x));

// たからばこ：左の 行きどまりの 宝箱
st.player.x = 258;
st.player.y = 1268;
G._test.step(0.016);
ok("たからばこが あく", st.chests[0].opened === true && st.items["メダル"] === 1, JSON.stringify(st.items));
closeDialogue();

// ★剣：かかしを 斬れる／うしろ向きでは 当たらない（Ph1）
const kk = st.enemies.filter((e) => e.id === "kakashi1")[0];
// もう1つの かかしが はんいに 入らない ように、右がわに 立つ
st.player.x = kk.x + 40;
st.player.y = kk.y;
G._test.face(1, 0); // かかしと 反たいを むく
st.player.atkCd = 0;
const before = st.floaters.length;
G._test.swing();
ok("うしろ向きでは 当たらない", st.floaters.length === before);
G._test.face(-1, 0); // かかしの ほうを むく
st.player.atkCd = 0;
G._test.swing();
ok("かかしを 斬ると 手ごたえが ある", st.floaters.some((f) => f.text === "コンッ！"));
ok("かかしは こわれない", kk.alive === true && kk.hp === kk.maxHp);

// ★ハート：ダメージ→むてき→やられて 再かいし（Ph1）
st.player.hp = 3;
st.player.invT = 0;
G._test.hurt(1);
const hp1 = st.player.hp;
G._test.hurt(1); // むてき中
ok("むてき中は つづけて 減らない", st.player.hp === hp1, "hp " + st.player.hp);
st.player.invT = 0;
G._test.hurt(9);
ok("やられると 立ちなおり時間に 入る", st.downT > 0);
for (let i = 0; i < 300 && st.downT > 0; i++) G._test.step(1 / 60);
ok("5びょう いないに 再かいし", st.downT <= 0 && st.player.hp === st.player.maxHp);
ok("やられても たからばこは 開いたまま", st.chests[0].opened === true && st.items["メダル"] === 1);

console.log(T.map((r) => r.join("  ")).join("\n"));
console.log("\n" + T.filter((r) => r[0] === "✅").length + " / " + T.length + " OK");
process.exit(T.some((r) => r[0] === "❌") ? 1 : 0);
