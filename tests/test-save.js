// 面の きりかえ・セーブ・フラグ・チェックポイント・カットシーン（Ph2 / AT-7）
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const drawn = [];
const ctxTarget = {
  measureText: () => ({ width: 10 }),
  fillText: (t, x, y) => drawn.push({ t, x, y }),
};
const ctxStub = new Proxy(ctxTarget, {
  get: (t, k) => (k in t ? t[k] : () => {}),
  set: (t, k, v) => ((t[k] = v), true),
});
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
// ブラウザの きおくそうち（localStorage）の ふり
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};

eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
global.MapData = global.window.MapData;
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);

const G = window.RiikoGame;
const H = () => G._test;
// かいわ まどが ほんとうに 出て いる ときだけ おす
const dialogOpen = () => !els["dialogue"].classList.contains("hidden");
const closeDialogue = () => {
  for (let i = 0; i < 40 && dialogOpen(); i++)
    els["dialogue"].dispatch("pointerdown", { stopPropagation() {} });
};
// 時間を すすめる。とちゅうで かいわが 出たら とじる
const run = (frames) => {
  const st = G._test.state;
  for (let i = 0; i < frames; i++) {
    G._test.step(1 / 60);
    if (dialogOpen()) closeDialogue();
  }
  return st;
};

// ===== 1) さいしょから はじめる =====
G.start();
let st = G._test.state;
ok("1面から はじまる", st.stageId === "stage1", st.stageId);
ok("面の なまえが 出る", st.titleT > 0 && st.titleText.indexOf("はじまり") >= 0, st.titleText);
ok("はじめから セーブが できて いる", G.hasSave() === true);

// ===== 2) フラグ・宝箱・てき を すすめる =====
st.player.x = 255; st.player.y = 1265; G._test.step(1 / 60); closeDialogue();
ok("たからばこを あけた", st.opened["c1"] === true && st.items["メダル"] === 1);

const e1 = st.enemies.filter((e) => e.id === "e1")[0];
e1.hp = 0;
e1.x = 600; e1.y = 1500;
st.player.x = 560; st.player.y = 1500; G._test.face(1, 0); st.player.atkCd = 0;
G._test.swing();
ok("てきを たおすと おぼえる", st.defeated["e1"] === true, JSON.stringify(st.defeated));

// ===== 3) チェックポイント =====
//   直前に 斬って いる ので、ヒットストップが おわるまで すこし すすめる
st.player.x = 700; st.player.y = 1500; run(10);
ok("チェックポイントを 通ると 復帰地点が かわる",
  Math.abs(st.respawn.y - 1500) < 1, JSON.stringify(st.respawn));
// やられても そこから
st.player.invT = 0;
G._test.hurt(9);
for (let i = 0; i < 300 && st.downT > 0; i++) G._test.step(1 / 60);
ok("やられると チェックポイントから 再かいし",
  Math.abs(st.player.y - 1500) < 1 && st.player.hp === st.player.maxHp,
  Math.round(st.player.x) + "," + Math.round(st.player.y));
ok("やられても たからばこ・たおした てきは そのまま",
  st.opened["c1"] === true && st.defeated["e1"] === true);

// ===== 4) トリガーと カットシーン =====
st.player.x = 700; st.player.y = 1010; G._test.step(1 / 60);
ok("抜け道を こえると フラグが 立つ", st.flags["passedSecret"] === true);
closeDialogue();

st.player.x = 710; st.player.y = 430; G._test.step(1 / 60);
ok("高台で フラグが 立つ", st.flags["sawCastle"] === true);
ok("カットシーンが はじまる", !!st.cut && st.paused === true);
const camBefore = { x: st.cam.x, y: st.cam.y };
// カメラが 動く あいだ（かいわは まだ おさない）
for (let i = 0; i < 80; i++) G._test.step(1 / 60);
ok("カメラが しろの ほうへ 動く", st.cam.y < camBefore.y - 20,
  Math.round(camBefore.y) + " → " + Math.round(st.cam.y));
// セリフが 出るまで すすめて、ぜんぶ おくる
for (let i = 0; i < 400 && st.cut; i++) {
  G._test.step(1 / 60);
  if (dialogOpen()) closeDialogue();
}
ok("カットシーンが おわると うごける", st.cut === null && st.paused === false);

// ===== 5) じょうけんつきの セリフ =====
const owl = st.npcs.filter((n) => n.id === "n4")[0];
st.player.x = owl.x + 200; st.player.y = owl.y; G._test.step(1 / 60); // いちど はなれる
st.player.x = owl.x; st.player.y = owl.y; G._test.step(1 / 60);
const owlLine = els["dialogue-text"].textContent;
ok("しろを 見た あとは ふくろうの セリフが かわる",
  owlLine.indexOf("やみの しろ") >= 0, owlLine);
closeDialogue();

// ===== 6) セーブ → ロード =====
const before = {
  stageId: st.stageId,
  flags: JSON.stringify(st.flags),
  items: JSON.stringify(st.items),
  opened: JSON.stringify(st.opened),
  defeated: JSON.stringify(st.defeated),
};
G._test.save();
// あそびなおす（つづきから）
G.start(null, { continue: true });
st = G._test.state;
ok("つづきから：面が おなじ", st.stageId === before.stageId, st.stageId);
ok("つづきから：フラグが おなじ", JSON.stringify(st.flags) === before.flags);
ok("つづきから：もちものが おなじ", JSON.stringify(st.items) === before.items);
ok("つづきから：あけた たからばこが おなじ", JSON.stringify(st.opened) === before.opened);
ok("つづきから：たおした てきが おなじ", JSON.stringify(st.defeated) === before.defeated);
ok("つづきから：あけた たからばこは 出ない", st.chests.filter((c) => c.id === "c1")[0].opened === true);
ok("つづきから：たおした てきは 生きかえらない",
  st.enemies.filter((e) => e.id === "e1")[0].alive === false);

// ===== 7) 面の きりかえ =====
st.player.x = 710; st.player.y = 330;
G._test.step(1 / 60);
ok("出口で かいわが 出る", st.paused === true && dialogOpen());
closeDialogue();
st = G._test.state;
ok("2面へ すすむ", st.stageId === "stage2", st.stageId);
ok("2面の なまえが 出る", st.titleText.indexOf("ささやき") >= 0, st.titleText);
ok("2面でも 仲間は いない", st.partner === null);
ok("2面に すすんだ ことが セーブされる", JSON.parse(store["riiko_save_v1"]).stageId === "stage2");

// ===== 8) さいしょから =====
G.eraseSave();
ok("セーブを けせる", G.hasSave() === false);
G.start();
st = G._test.state;
ok("けした あとは 1面から", st.stageId === "stage1");
ok("けした あとは もちものも ゼロ", Object.keys(st.items).length === 0);

// まとめ
let ng = 0;
for (const r of T) { console.log(r[0] + "  " + r[1] + "  " + r[2]); if (r[0] === "❌") ng++; }
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng === 0 ? 0 : 1);
