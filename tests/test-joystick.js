// バーチャルジョイスティック（スライドパッド）と描画最適化のテスト
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const drawn = [];
const drawImages = [];
const ctxTarget = {
  measureText: () => ({ width: 10 }),
  fillText: (t, x, y) => drawn.push({ t, x, y }),
  fillRect: () => {},
  drawImage: (img, x, y) => drawImages.push({ img, x, y }),
  arc: () => {},
  arcTo: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  fill: () => {},
  stroke: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
};
const ctxStub = new Proxy(ctxTarget, {
  get: (t, k) => (k in t ? t[k] : () => {}),
  set: (t, k, v) => ((t[k] = v), true),
});

function mkEl(id, className) {
  const L = {};
  const children = [];
  const el = {
    id: id || "",
    className: className || "",
    style: {},
    classList: {
      _s: new Set(className ? className.split(" ") : []),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; if (v) this._s.add(c); else this._s.delete(c); return v; }
    },
    addEventListener: (t, fn) => ((L[t] = L[t] || []).push(fn)),
    dispatchEvent: (ev) => {
      const type = ev.type || ev;
      (L[type] || []).forEach((f) => f(ev));
    },
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 20, top: 400, width: 140, height: 140 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    focus: () => {},
    textContent: "",
    width: 140,
    height: 140,
    querySelector: (sel) => {
      if (sel === ".joystick-knob") return knobEl;
      if (sel === ".joystick-base") return baseEl;
      return null;
    },
    querySelectorAll: () => [],
    appendChild: (c) => children.push(c),
  };
  return el;
}

const baseEl = mkEl("joystick-base", "joystick-base");
const knobEl = mkEl("joystick-knob", "joystick-knob");
const joystickEl = mkEl("joystick", "joystick-container");

const els = {
  joystick: joystickEl,
  gate: mkEl("gate"),
  hint: mkEl("hint"),
  game: mkEl("game"),
};

global.document = {
  getElementById: (id) => els[id] || (els[id] = mkEl(id)),
  querySelectorAll: (sel) => (sel === ".dbtn" ? [] : []),
  createElement: (tag) => mkEl(tag),
};
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};

const windowListeners = {};
global.window = {
  addEventListener: (t, fn) => ((windowListeners[t] = windowListeners[t] || []).push(fn)),
  dispatchEvent: (ev) => {
    const type = ev.type || ev;
    (windowListeners[type] || []).forEach((f) => f(ev));
  },
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 800,
  STAGES: {},
  MAPS: {},
  WALKS: {},
};
global.KeyboardEvent = function (t, opts) {
  this.type = t;
  this.key = opts && opts.key;
};

global.Image = function () { this.complete = false; this.naturalWidth = 0; };
global.localStorage = (function () {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => (m[k] = String(v)),
    removeItem: (k) => delete m[k],
  };
})();
global.sessionStorage = global.localStorage;
global.AudioContext = undefined;

// スクリプト読み込み
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
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/main.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);

// ゲーム開始
window.RiikoGame.start("stage1");
const state = window.RiikoGame._test.state;
state.paused = false; // プロローグ会話を終了
state.cut = null; // プロローグカットシーンを終了して操作可能にする

// 1. 初期状態の確認
ok("ゲーム開始時にプレイヤーが存在する", !!state.player);
ok("ジョイスティック要素が正しく検出されている", !!joystickEl);

// 2. 右方向へのスティック操作
const startX = state.player.x;
const startY = state.player.y;

// 中央は left: 20 + 70 = 90, top: 400 + 70 = 470
// 右に40pxドラッグ
joystickEl.dispatchEvent({ type: "pointerdown", pointerId: 1, clientX: 90, clientY: 470, preventDefault: () => {} });
joystickEl.dispatchEvent({ type: "pointermove", pointerId: 1, clientX: 130, clientY: 470, preventDefault: () => {} });

window.RiikoGame._test.step(0.1);
ok("スティックを右に倒すと右へ移動する", state.player.x > startX && state.player.y === startY);

// 3. 斜め右上へのスティック操作
const pxBeforeDiag = state.player.x;
const pyBeforeDiag = state.player.y;
// 右上（clientX: 90 + 35, clientY: 470 - 35）
joystickEl.dispatchEvent({ type: "pointermove", pointerId: 1, clientX: 125, clientY: 435, preventDefault: () => {} });

window.RiikoGame._test.step(0.1);
ok("スティックを右上に倒すとXが増加する", state.player.x > pxBeforeDiag);
ok("スティックを右上に倒すとYが減少する（上へ進む）", state.player.y < pyBeforeDiag);

// 4. 指を離したときの停止（resetStick）
joystickEl.dispatchEvent({ type: "pointerup", pointerId: 1, preventDefault: () => {} });
const pxAfterRelease = state.player.x;
const pyAfterRelease = state.player.y;

window.RiikoGame._test.step(0.1);
ok("指を離すとX座標が停止する", state.player.x === pxAfterRelease);
ok("指を離すとY座標が停止する", state.player.y === pyAfterRelease);
ok("指を離すとノブのactiveクラスが外れる", !knobEl.classList.contains("active"));

// 5. 不感帯（デッドゾーン）のテスト
// 中心から微小（3px）な動きでは反応しないこと
joystickEl.dispatchEvent({ type: "pointerdown", pointerId: 2, clientX: 90, clientY: 470, preventDefault: () => {} });
joystickEl.dispatchEvent({ type: "pointermove", pointerId: 2, clientX: 93, clientY: 471, preventDefault: () => {} });

window.RiikoGame._test.step(0.1);
ok("デッドゾーン内では移動しない", state.player.x === pxAfterRelease && state.player.y === pyAfterRelease);
joystickEl.dispatchEvent({ type: "pointerup", pointerId: 2, preventDefault: () => {} });

// 6. 衝突判定の高速スキップ機能の検証
// プレイヤーの周囲に障害物がある状態で壁抜け・めり込みしないこと
state.player.x = 1223;
state.player.y = 4320; // 南の木のすぐ上（木は x: 1223, y: 4391, r: 26）
window.RiikoGame.setStick(0, 1.0); // 南へ移動
for (let i = 0; i < 20; i++) {
  window.RiikoGame._test.step(0.05);
}
const footY = state.player.y + 44 * 0.28;
const hasOverlap = state.obstacles.some((o) => {
  if (o.x === 1223 && o.y === 4391) {
    return Math.hypot(state.player.x - o.x, footY - (o.y + (o.r ? o.r * 0.2 : 0))) < (o.r || 26) + 18 - 1;
  }
  return false;
});
ok("壁の障害物判定が機能し、木にめりこまない", !hasOverlap);
window.RiikoGame.setStick(0, 0);

// 7. 地面描画のチャンクキャッシュ最適化の検証
// 描画実行時に drawImage が呼ばれていること
drawImages.length = 0;
window.RiikoGame._test.step(0.016);
ok("オフスクリーンチャンクキャッシュにより drawImage で地面が転送される", drawImages.length > 0, "回数: " + drawImages.length);

// 結果表示
console.log("");
T.forEach(([m, n, e]) => console.log(m, " " + n, e ? " " + e : ""));
const ng = T.filter((t) => t[0] === "❌").length;
console.log("");
if (ng === 0) {
  console.log(`${T.length} / ${T.length} OK (All Passed)`);
} else {
  console.log(`${ng} FAILED`);
  process.exit(1);
}
