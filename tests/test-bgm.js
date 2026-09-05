// BGM（背景音楽）自動合成システムのテスト
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const ctxStub = new Proxy(
  { measureText: () => ({ width: 10 }) },
  { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }
);
function mkEl(id) {
  const L = {};
  return {
    id, style: {}, textContent: "", width: 0, height: 0,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; if (v) this._s.add(c); else this._s.delete(c); return v; } },
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
global.localStorage = (function () {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => (m[k] = String(v)),
    removeItem: (k) => delete m[k],
  };
})();
global.AudioContext = undefined;

eval(fs.readFileSync(path.join(ROOT, "js/assets-data.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/assets.js"), "utf8"));
global.Assets = global.window.Assets;
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

console.log("=== 1) BGMトラック構成と曲データの確認 ===");
const G = window.RiikoGame;
ok("RiikoGame.bgm が存在する", !!G.bgm);
const tracks = G.bgm.TRACKS;
ok("1面BGM (forest) が定義されている", !!tracks.forest && tracks.forest.melody.length > 0);
ok("2面BGM (valley) が定義されている", !!tracks.valley && tracks.valley.melody.length > 0);
ok("タイトルBGM (title) が定義されている", !!tracks.title && tracks.title.melody.length > 0);

ok("forest のテンポと小節数が正しい", tracks.forest.bpm === 116 && tracks.forest.totalSteps === 64);
ok("forest にベースとリズムが含まれている", tracks.forest.bass.length === 64 && tracks.forest.drum.length === 64);
ok("valley のテンポと小節数が正しい", tracks.valley.bpm === 96 && tracks.valley.totalSteps === 64);

console.log("\n=== 2) 面ごとのBGM切り替えと連動 ===");
// 1面開始
G.start("stage1");
ok("1面開始時は forest が再生される", G.bgm.currentTrack() === "forest");

// 2面開始
G.start("stage2");
ok("2面開始時は valley が再生される", G.bgm.currentTrack() === "valley");

// タイトル画面 / 停止
G.stop();
ok("ゲーム停止時は BGM も停止する", G.bgm.currentTrack() === null);

console.log("\n=== 3) ミュート・音量制御とセーブ保持 ===");
ok("初期状態はBGMオン", G.bgm.isOn() === true);
const muted = G.bgm.toggle();
ok("toggle でミュートになる", muted === false && G.bgm.isOn() === false);
ok("ミュート設定が localStorage に保存される", global.localStorage.getItem("riiko_bgm_on") === "0");

const unmuted = G.bgm.toggle();
ok("もう一度 toggle で再生再開になる", unmuted === true && G.bgm.isOn() === true);
ok("再開設定が localStorage に保存される", global.localStorage.getItem("riiko_bgm_on") === "1");

console.log("\n=== 4) 会話ウィンドウとのダッキング（音量自動調節）連携 ===");
G.start("stage1");
const dlg = els["dialogue"];
// 会話が開いた状態を模倣
dlg.classList.remove("hidden");
// 会話中はダッキング有効
G.bgm.duck(true);
ok("ダッキング呼び出しがエラーなく実行できる", true);
G.bgm.duck(false);
ok("ダッキング解除がエラーなく実行できる", true);

console.log("");
let ng = 0;
for (const r of T) {
  console.log(r[0] + "  " + r[1] + "  " + (r[2] || ""));
  if (r[0] === "❌") ng++;
}
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng === 0 ? 0 : 1);
