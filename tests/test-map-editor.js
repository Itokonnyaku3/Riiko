// マップ作成ツールを Node で うごかして たしかめる（DOMのふりをする）
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const drawn = []; // かいた 絵文字を きろくする
const arcs = []; // かいた まる
const ctxTarget = {
  measureText: () => ({ width: 10 }),
  // どんな「ぬり色」「こさ」で かいたかも おぼえる（うすくなっていないか しらべる ため）
  fillText: (t, x, y) => drawn.push({ t, x, y, style: ctxTarget.fillStyle, alpha: ctxTarget.globalAlpha }),
  arc: (x, y, r) => arcs.push({ x, y, r }),
};
const ctxStub = new Proxy(ctxTarget, {
  get(t, k) {
    if (k in t) return t[k];
    return () => {};
  },
  set(t, k, v) {
    t[k] = v;
    return true;
  },
});

function mkEl(id, tag) {
  const listeners = {};
  const el = {
    id,
    tagName: (tag || "div").toUpperCase(),
    dataset: {},
    style: {},
    children: [],
    value: "",
    checked: false,
    textContent: "",
    innerHTML: "",
    files: [],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); c.parent = this; return c; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatch(t, ev) { (listeners[t] || []).forEach((f) => f(ev)); },
    setPointerCapture() {},
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 268, top: 88, width: el.clientWidth, height: el.clientHeight }),
    clientWidth: 1012,
    clientHeight: 632,
    width: 0,
    height: 0,
    click() { if (this.onclick) this.onclick(); },
    select() {},
    _listeners: listeners,
  };
  return el;
}

const els = {};
function getEl(id) {
  if (!els[id]) els[id] = mkEl(id, id === "map" ? "canvas" : "div");
  return els[id];
}

global.document = {
  getElementById: getEl,
  createElement: (tag) => mkEl(null, tag),
  querySelectorAll(sel) {
    const m = sel.match(/^#([\w-]+)\s+(.+)$/);
    if (!m) return [];
    const parent = getEl(m[1]);
    return parent.children;
  },
  execCommand: () => true,
};

let rafCb = null;
global.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = v),
  removeItem: (k) => delete store[k],
};
global.confirm = () => true;
global.alert = () => {};
global.Blob = function () {};
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL: () => {} };
global.FileReader = function () {};
// ほぞんの「まってから書く」を すぐ書くに して、テストしやすく する
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};

const winListeners = {};
global.window = {
  addEventListener: (t, fn) => ((winListeners[t] = winListeners[t] || []).push(fn)),
  devicePixelRatio: 1,
};
global.window.document = global.document;
global.window.localStorage = global.localStorage;
global.window.requestAnimationFrame = global.requestAnimationFrame;

// ---- よみこむ ----
eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
const MapData = global.window.MapData;
global.MapData = MapData;
eval(fs.readFileSync(path.join(ROOT, "tools/map-editor.js"), "utf8"));

// ---- ここから テスト ----
const canvas = getEl("map");
const T = [];
const ok = (name, cond, extra) => { T.push([cond ? "✅" : "❌", name, extra === undefined ? "" : extra]); };

function frame(ts) { if (rafCb) { const cb = rafCb; rafCb = null; cb(ts); } }
function pe(type, x, y, btn) {
  canvas.dispatch(type, { clientX: x, clientY: y, button: btn || 0, buttons: 1, pointerId: 1, preventDefault() {} });
}
function data() { return JSON.parse(localStorage.getItem("riiko.mapeditor.v1")); }
function tool(id) { document.querySelectorAll("#tools button").find((b) => b.dataset.tool === id).click(); }
function chip(sec, key, val) { document.querySelectorAll("#" + sec + " .chip").find((b) => b.dataset[key] === val).click(); }

frame(16); // 1フレーム目：大きさを 合わせる

// 1) がめん→ワールドの ばいりつ（ぜんたいが 見える ように なっているか）
const world = { w: 1400, h: 2200 };
const expectZoom = Math.min(1012 / (world.w + 80), 632 / (world.h + 80));
// 画面の まん中（268+506, 88+316）＝ ワールドの まん中 になるはず
pe("pointermove", 268 + 506, 88 + 316);
tool("marker");
pe("pointerdown", 268 + 506, 88 + 316);
pe("pointerup", 268 + 506, 88 + 316);
const mk = data().markers[0];
ok("がめんの まん中＝マップの まん中", Math.abs(mk.x - 700) < 2 && Math.abs(mk.y - 1100) < 2, JSON.stringify(mk));

// ワールドざひょう → がめんざひょう（まん中が 一致しているので そこから 計算）
const Z = expectZoom;
const SX = (wx) => 268 + 506 + (wx - world.w / 2) * Z;
const SY = (wy) => 88 + 316 + (wy - world.h / 2) * Z;
const at = (type, wx, wy) => pe(type, SX(wx), SY(wy));

// 2) じめん（しかく）を かく
tool("ground-rect");
at("pointerdown", 200, 200);
at("pointermove", 600, 700);
at("pointerup", 600, 700);
const a0 = data().areas[0];
ok("じめん□が できる", !!a0 && a0.shape === "rect" && a0.w > 100, JSON.stringify(a0));
ok("じめんは マップの 中に おさまる",
  a0.x >= 0 && a0.y >= 0 && a0.x + a0.w <= world.w + 1 && a0.y + a0.h <= world.h + 1);

// 3) 森が じめんの ぶんだけ へる
const fillAll = MapData.buildFill({ world: { width: 1400, height: 2200 }, areas: [], fill: data().fill });
const fillNow = MapData.buildFill(data());
ok("じめんの ぶん 木が へる", fillNow.length < fillAll.length, fillAll.length + " → " + fillNow.length);
ok("じめんの 上に 木が ない", !fillNow.some((t) => MapData.inArea(a0, t.x, t.y, 0)));

// 4) パーツを ならべる（線）
tool("part-line");
at("pointerdown", 300, 900);
at("pointermove", 900, 900);
at("pointerup", 900, 900);
const objs = data().objects.length;
ok("パーツが 一れつに ならぶ", objs > 5, objs + "こ");

// 5) パーツで うめる（しかく）
tool("part-fill");
chip("parts", "part", "🧱");
at("pointerdown", 300, 1300);
at("pointermove", 700, 1600);
at("pointerup", 700, 1600);
const objs2 = data().objects.length;
ok("しかくを パーツで うめられる", objs2 > objs + 10, objs + " → " + objs2);
ok("えらんだ パーツに なる", data().objects[objs2 - 1].sprite === "🧱");

// 6) けす
tool("erase");
at("pointerdown", 500, 1450);
at("pointerup", 500, 1450);
ok("パーツを けせる", data().objects.length < objs2, objs2 + " → " + data().objects.length);

// 7) じどうの 木を けす → exclude に のこる
const before = data().fill.exclude.length;
tool("erase");
at("pointerdown", 1300, 2100);
at("pointerup", 1300, 2100);
ok("じどうの 木も けせる（おぼえる）", data().fill.exclude.length > before, before + " → " + data().fill.exclude.length);
const rebuilt = MapData.buildFill(data());
ok("けした 木は ゲームでも 出ない", rebuilt.length === MapData.buildFill(Object.assign({}, data(), { fill: Object.assign({}, data().fill, { exclude: [] }) })).length - data().fill.exclude.length);

// 8) もどす／やりなおす
const s1 = JSON.stringify(data());
getEl("b-undo").click();
const s2 = JSON.stringify(data());
getEl("b-redo").click();
const s3 = JSON.stringify(data());
ok("もどす／やりなおす", s2 !== s1 && s3 === s1,
  "けした木 " + JSON.parse(s1).fill.exclude.length + " → もどす " + JSON.parse(s2).fill.exclude.length + " → やりなおす " + JSON.parse(s3).fill.exclude.length);

// 9) じめんを けす
tool("ground-erase");
const areasBefore = data().areas.length;
at("pointerdown", 400, 400);
at("pointerup", 400, 400);
ok("じめんを けせる", data().areas.length === areasBefore - 1);

// 10) えが かけている
//   ちいさく うつっている ときは「まる」で かんたんに かく（かるくする ため）
drawn.length = 0;
arcs.length = 0;
frame(300);
ok("ぜんたい表示：まるで かるく えがく", arcs.length > 300, "まる " + arcs.length + "こ");
// 大きくして（ホイール）から もう1フレーム → 絵文字で かく
canvas.dispatch("wheel", { clientX: 268 + 506, clientY: 88 + 316, deltaY: -100, preventDefault() {} });
for (let i = 0; i < 12; i++)
  canvas.dispatch("wheel", { clientX: 268 + 506, clientY: 88 + 316, deltaY: -100, preventDefault() {} });
drawn.length = 0;
frame(320);
ok("大きくすると 絵文字で えがく", drawn.filter((d) => d.t === "🌳").length > 5,
  "🌳 " + drawn.filter((d) => d.t === "🌳").length + "こ");

// 手でおいた パーツが うすくならない（かげの 色が のこらない）
const usui = drawn.filter((d) => (d.alpha !== undefined && d.alpha < 1) || /rgba\([^)]*0\.\d+\)/.test(String(d.style)));
ok("パーツが 半とうめいに ならない", usui.length === 0,
  usui.length ? usui[0].t + " が " + usui[0].style + " / alpha " + usui[0].alpha : "ぜんぶ くっきり");


// 12) ファイルに だす → よみこむ（往復）
tool("marker");
const exported = (function () {
  let captured = null;
  const origBlob = global.Blob;
  global.Blob = function (parts) { captured = parts[0]; };
  getEl("b-save").click();
  global.Blob = origBlob;
  return captured;
})();
ok("ファイルに だせる", !!exported && exported.indexOf("/*MAPDATA*/") > 0);
const roundTrip = JSON.parse(exported.slice(exported.indexOf("/*MAPDATA*/") + 11, exported.indexOf("/*ENDMAPDATA*/")));
ok("だした ものを 読みなおせる", roundTrip.world.width === 1400 && Array.isArray(roundTrip.areas));

// 13) シナリオ用コード
getEl("b-code").click();
const code = getEl("modal-text").value;
ok("シナリオ用コードが 出る", code.indexOf("MapData.build") > 0 && code.indexOf("enemies") > 0);
ok("めじるしが コードに 入る", /x: \d+, y: \d+/.test(code));

// 14) できてる ステージを よみこむ
getEl("f-maps").value = "stage1";
getEl("b-loadmap").click();
ok("stage1 を よみこめる", data().name === "stage1" && data().areas.length === 18);
ok("stage1 の 木は 661本", MapData.buildFill(data()).length === 661, MapData.buildFill(data()).length);

// 15) ためしに あるく（stage1 の スタート地点で）
tool("walk");
let ts = 1000;
// 👧 は「スタートの めじるし」でも つかうので、さいごに かかれた ほう＝あるいてる子
const girl = () => {
  drawn.length = 0;
  ts += 100;
  frame(ts);
  return drawn.filter((d) => d.t === "👧").pop();
};
const key = (type, k) => (winListeners[type] || []).forEach((f) => f({ key: k, target: { tagName: "BODY" } }));
const g0 = girl();
ok("ためしに あるく が はじまる", getEl("walkhint").classList.contains("hidden") === false);
ok("スタート地点に 出る（村）", !!g0 && Math.abs(g0.x - 700) < 5 && Math.abs(g0.y - 2200) < 5,
  g0 ? Math.round(g0.x) + "," + Math.round(g0.y) : "なし");

key("keydown", "d"); // みぎへ
for (let i = 0; i < 10; i++) girl(); // やく1びょう
const g1 = girl();
ok("キーで あるく", g1.x > g0.x + 60, "x " + Math.round(g0.x) + " → " + Math.round(g1.x));
key("keyup", "d");
const g2 = girl();
const g3 = girl();
ok("キーを はなすと とまる", Math.abs(g3.x - g2.x) < 1);

key("keydown", "s"); // した（森の かべ に むかって）
for (let i = 0; i < 25; i++) girl();
key("keyup", "s");
const g4 = girl();
ok("村の 南の かべで とまる（すりぬけない）", g4.y < 2360, "y " + Math.round(g4.y));
ok("木に めりこまない",
  !MapData.buildFill(data()).some((t) => Math.hypot(t.x - g4.x, t.y - g4.y) < t.r + 18 - 0.5));

// けっか
console.log(T.map((r) => r.join("  ")).join("\n"));
console.log("\n" + T.filter((r) => r[0] === "✅").length + " / " + T.length + " OK");
process.exit(T.some((r) => r[0] === "❌") ? 1 : 0);
