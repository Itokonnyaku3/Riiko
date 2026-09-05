const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(".");
const ctxStub = new Proxy({ measureText: () => ({ width: 10 }), fillText() {}, fillRect() {} }, {
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
global.document = { getElementById: (id) => els[id] || (els[id] = mkEl(id)), querySelectorAll: () => [] };
global.window = { addEventListener: () => {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.Image = function () { this.complete = false; this.naturalWidth = 0; };

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

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
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (name, cond, info) => T.push([cond ? "✅" : "❌", name, info || ""]);

// 1. 初期状態ではエディタマップなし
ok("初期状態はエディタマップなし", !window.RiikoGame.hasEditedMap("stage1"));

// 2. エディタマップを保存
const customMap = {
 name: "stage1",
 title: "テスト連携の森",
 world: { width: 3200, height: 3200, ground: "#123456" },
 areas: [{ shape: "rect", x: 200, y: 200, w: 600, h: 600, kind: "dirt" }],
 fill: { on: false },
 player: { x: 300, y: 300 }
};

MapData.saveEditedMap("stage1", customMap);
ok("エディタマップの保存を検知", window.RiikoGame.hasEditedMap("stage1") === true);

// 3. ゲーム開始時に自動適用される
window.RiikoGame.start("stage1");
const state = window.RiikoGame._test.state;
ok("ゲームの背景色がエディタのものに変更", state.world.ground === "#123456");
ok("ゲームのプレイヤー位置がエディタのものに変更", state.player.x === 300 && state.player.y === 300);

// 4. 実行中にエディタから即座にリアルタイム反映（リロードなし）
const liveMap = {
  name: "stage1",
  title: "リアルタイム更新テスト",
  world: { width: 3200, height: 3200, ground: "#abcdef" },
  areas: [{ shape: "rect", x: 100, y: 100, w: 800, h: 800, kind: "stone" }],
  obstacles: [{ x: 500, y: 500, r: 40, sprite: "rock" }],
  fill: { on: false },
  player: { x: 300, y: 300 },
};

// プレイヤーの位置を少し移動
state.player.x = 350;
state.player.y = 360;

// 即時反映を実行
window.RiikoGame._test.applyLiveMap(liveMap);
ok("ゲームプレイ中にリロードなしで即座に背景色が更新される", state.world.ground === "#abcdef");
ok("リアルタイム更新後もプレイヤーの操作位置が維持される", state.player.x === 350 && state.player.y === 360);
ok("リアルタイム更新で新しい障害物が追加される", state.obstacles.some((o) => o.x === 500 && o.y === 500));

// 5. エディタマップをリセット
window.RiikoGame.clearEditedMap("stage1");
ok("リセット後はエディタマップなし", !window.RiikoGame.hasEditedMap("stage1"));

console.log(T.map(r => r.join("  ")).join("\n"));
const failed = T.filter(r => r[0] === "❌");
process.exit(failed.length > 0 ? 1 : 0);
