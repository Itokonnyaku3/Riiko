// たたかいの バランスを たしかめる（AT-9）
//   ・てきを たおすのに 何回 斬るか（3〜8回に おさまって いるか）
//   ・3だんコンボ が はたらくか
//   ・ジャスト反げき（てきの こうげきの すぐ あと）が 2ばいに なるか
//   ・突進ネコ：ためる→走る→目を まわす、の じゅんに なるか
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

// ---- ブラウザの ふり（えがくのは 何も しない）----
const ctxStub = new Proxy(
  { measureText: () => ({ width: 10 }) },
  { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }
);
function mkEl(id) {
  const L = {};
  return {
    id, style: {}, textContent: "", width: 0, height: 0,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener: (t, fn) => ((L[t] = L[t] || []).push(fn)),
    dispatch: (t, ev) => (L[t] || []).forEach((f) => f(ev)),
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    querySelectorAll: () => [],
  };
}
const els = {};
global.document = { getElementById: (id) => (els[id] = els[id] || mkEl(id)), querySelectorAll: () => [] };
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.window = { addEventListener: () => {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.Image = function () { this.complete = false; this.naturalWidth = 0; };
global.localStorage = (function () { const m = {}; return {
  getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => (m[k] = String(v)),
  removeItem: (k) => delete m[k] }; })();

eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
global.MapData = global.window.MapData;
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
global.SCENARIO = global.window.STAGES.stage1;
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);

const G = window.RiikoGame;
G.start(SCENARIO);
const H = G._test;
const st = H.state;
const step = (n) => { for (let i = 0; i < n; i++) H.step(1 / 60); };
const closeDialogue = () => {
  for (let i = 0; i < 30 && st.paused; i++)
    els["dialogue"].dispatch("pointerdown", { stopPropagation() {} });
};

// てきの となりに 立って、1回ずつ 斬る（コンボが つながらない ように 間を あける）
function hitsToDefeat(id, combo) {
  const e = st.enemies.filter((x) => x.id === id)[0];
  e.alive = true;
  e.hp = e.maxHp;
  let n = 0;
  while (e.alive && n < 30) {
    e.x = 600; e.y = 1500; e.knockT = 0; e.attackedT = 9; e.chargeState = "wait";
    st.player.x = 560; st.player.y = 1500;
    st.player.hp = st.player.maxHp; st.downT = 0; st.player.invT = 5;
    H.face(1, 0);
    st.player.atkCd = 0;
    if (!combo) { st.player.comboT = 0; st.player.combo = 0; }
    H.swing();
    step(2);
    closeDialogue();
    n++;
  }
  return n;
}

console.log("=== 1) てきを たおすのに 何回 斬るか（3〜8回が ねらい）===");
for (const id of ["e1", "e2", "e3", "e4"]) {
  const e = st.enemies.filter((x) => x.id === id)[0];
  const n = hitsToDefeat(id, false);
  console.log("   " + (e.name + "（HP" + e.maxHp + "）").padEnd(22) + n + " 回");
  ok(e.name + " は 3〜8回で たおせる", n >= 3 && n <= 8, n + "回");
}

console.log("\n=== 2) コンボ と ジャスト反げき ===");
const kk = st.enemies.filter((x) => x.id === "kakashi1")[0];
function swingAt(target, gap) {
  target.x = 900; target.y = 2250; target.knockT = 0;
  st.player.x = 860; st.player.y = 2250;
  H.face(1, 0);
  st.player.atkCd = 0;
  if (gap) { st.player.comboT = 0; st.player.combo = 0; }
  st.floaters.length = 0;
  H.swing();
  return st.floaters.map((f) => f.text);
}
swingAt(kk, true);
ok("1はつめは ふつう", H.combo() === 1);
swingAt(kk, false);
ok("2はつめに つながる", H.combo() === 2);
const third = swingAt(kk, false);
ok("3はつめで「ズバッ！」が 出る", third.indexOf("ズバッ！") >= 0, third.join(","));
swingAt(kk, false);
ok("4はつめで 1に もどる", H.combo() === 1);

// 間を あけると つながらない
swingAt(kk, true);
step(60); // 1びょう まつ
ok("間が あくと コンボが きれる", st.player.combo === 0);

// ジャスト反げき：てきが こうげきした 直後
const e1 = st.enemies.filter((x) => x.id === "e1")[0];
e1.alive = true; e1.hp = e1.maxHp; e1.knockT = 0; e1.chargeState = "wait";
e1.x = 600; e1.y = 1500;
st.player.x = 560; st.player.y = 1500; st.player.invT = 5;
st.player.comboT = 0; st.player.combo = 0;
e1.attackedT = 0; // ちょうど いま こうげきした
st.player.atkCd = 0;
st.floaters.length = 0;
H.face(1, 0);
H.swing();
const justTexts = st.floaters.map((f) => f.text);
ok("こうげきの 直後に 斬ると「ナイス！」", justTexts.indexOf("ナイス！") >= 0, justTexts.join(","));
ok("ナイス！は ダメージが 2ばい", justTexts.indexOf("-" + st.player.attack * 2) >= 0, justTexts.join(","));

// 間が あいて いれば ふつう
e1.hp = e1.maxHp; e1.knockT = 0; e1.x = 600; e1.y = 1500;
st.player.x = 560; st.player.y = 1500;
e1.attackedT = 9;
st.player.comboT = 0; st.player.combo = 0;
st.player.atkCd = 0;
st.floaters.length = 0;
H.swing();
const normalTexts = st.floaters.map((f) => f.text);
ok("ふだんは ふつうの ダメージ", normalTexts.indexOf("-" + st.player.attack) >= 0, normalTexts.join(","));

console.log("\n=== 3) 突進ネコ（ためる → 走る → 目を まわす）===");
const ch = st.enemies.filter((x) => x.id === "e4")[0];
ok("e4 は 突進ネコ", ch.behavior === "charge");
ch.alive = true; ch.hp = ch.maxHp; ch.knockT = 0;
ch.x = 700; ch.y = 900; ch.home.x = 700; ch.home.y = 900;
ch.chargeState = "wait"; ch.chargeT = 0;
st.player.x = 700; st.player.y = 1000; st.player.invT = 999; // ダメージは 受けない
const seen = [];
for (let i = 0; i < 400; i++) {
  H.step(1 / 60);
  closeDialogue();
  if (seen[seen.length - 1] !== ch.chargeState) seen.push(ch.chargeState);
  st.player.invT = 999;
}
console.log("   じょうたいの ながれ: " + seen.join(" → "));
ok("ためる(windup) が ある", seen.indexOf("windup") >= 0);
ok("走る(dash) が ある", seen.indexOf("dash") >= 0);
ok("目を まわす(dizzy) が ある", seen.indexOf("dizzy") >= 0);
ok("ためる のあと 走る", seen.indexOf("dash") > seen.indexOf("windup"));
ok("走った あと 目を まわす", seen.indexOf("dizzy") > seen.indexOf("dash"));

// ★ためて いる あいだに よこへ 動けば よけられるか
//   （さいごまで ねらいを 追いかける と、どこへ にげても 当たって しまう）
function dodgeTest(moveDuringWindup) {
  ch.alive = true; ch.hp = ch.maxHp; ch.knockT = 0;
  ch.x = 700; ch.y = 800; ch.home.x = 700; ch.home.y = 800;
  ch.chargeState = "wait"; ch.chargeT = 0;
  st.player.x = 700; st.player.y = 980;
  st.player.hp = st.player.maxHp; st.downT = 0;
  let touched = false;
  let dashed = false;
  for (let i = 0; i < 260; i++) {
    // ためて いる あいだ だけ よこへ 動く
    if (moveDuringWindup && ch.chargeState === "windup") H.press("ArrowRight", true);
    else H.press("ArrowRight", false);
    H.step(1 / 60);
    closeDialogue();
    if (ch.chargeState === "dash") {
      dashed = true;
      const d = Math.hypot(ch.x - st.player.x, ch.y - st.player.y);
      if (d < 18 + 18) touched = true;
    }
  }
  H.press("ArrowRight", false);
  return { touched, dashed };
}
const dodged = dodgeTest(true);
const stood = dodgeTest(false);
ok("突進は ちゃんと はっしゃ される", dodged.dashed && stood.dashed);
ok("ためる あいだに 動けば よけられる", dodged.touched === false, dodged.touched ? "当たった" : "よけられた");
ok("じっと して いると 当たる（＝ちゃんと ねらって いる）", stood.touched === true, stood.touched ? "当たった" : "当たらない");

// 目を まわして いる あいだは 2ばい
ch.chargeState = "dizzy"; ch.chargeT = 5;
ch.hp = ch.maxHp; ch.knockT = 0; ch.attackedT = 9;
ch.x = 600; ch.y = 1500;
st.player.x = 560; st.player.y = 1500;
st.player.comboT = 0; st.player.combo = 0;
st.player.atkCd = 0;
st.floaters.length = 0;
H.face(1, 0);
H.swing();
const dizzyTexts = st.floaters.map((f) => f.text);
ok("目を まわして いる ところを 斬ると 2ばい", dizzyTexts.indexOf("-" + st.player.attack * 2) >= 0, dizzyTexts.join(","));

// まとめ
console.log("");
let ng = 0;
for (const r of T) { console.log(r[0] + "  " + r[1] + "  " + r[2]); if (r[0] === "❌") ng++; }
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng === 0 ? 0 : 1);
