// 2面「ささやきの谷」の川さかのぼり・ペンギン・爆弾岩押し・ダム爆破イベントのテスト
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const drawn = [];
const ctxStub = new Proxy({
  measureText: () => ({ width: 10 }),
  fillText: (t, x, y) => drawn.push({ t, x, y }),
}, {
  get: (t, k) => (k in t ? t[k] : () => {}),
  set: (t, k, v) => ((t[k] = v), true),
});

function mkEl(id) {
  const L = {};
  return {
    id: id || "",
    style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; if (v) this._s.add(c); else this._s.delete(c); return v; }
    },
    addEventListener: (t, fn) => ((L[t] = L[t] || []).push(fn)),
    dispatch: (t, ev) => (L[t] || []).forEach((f) => f(ev)),
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    focus: () => {},
    textContent: "",
    querySelectorAll: () => [],
  };
}

const els = {};
global.document = {
  getElementById: (id) => els[id] || (els[id] = mkEl(id)),
  querySelectorAll: () => [],
};
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};
global.window = {
  addEventListener: () => {},
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 800,
  STAGES: {},
  MAPS: {},
  WALKS: {},
};
global.Image = function () { this.complete = false; this.naturalWidth = 0; };
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
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
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);
const G = window.RiikoGame;
const H = G._test;
const dialogOpen = () => !els["dialogue"].classList.contains("hidden");
const closeDialogue = () => {
  for (let i = 0; i < 40 && dialogOpen(); i++)
    els["dialogue"].dispatch("pointerdown", { stopPropagation() {} });
};
const run = (n) => {
  for (let i = 0; i < n; i++) {
    H.step(1 / 60);
    if (dialogOpen()) closeDialogue();
  }
};

G.eraseSave();
G.start("stage2", { continue: false });
let st = H.state;
st.cut = null;
st.paused = false;

// 1. 初期状態
ok("2面『ささやきの谷』から開始", st.stageId === "stage2");
ok("開始時は川が流れていない（枯れている）", !st.flags["riverFlowing"]);
const riverAreas = (st.world.areas || []).filter((a) => a.river);
ok("川エリアが存在する", riverAreas.length > 0, riverAreas.length + "箇所");
ok("川が流れる前は川底が砂・土である", riverAreas.some((a) => a.kind === "sand" || a.kind === "dirt"));

// 2. クモの巣（s2n1）でベルを救出
const web = st.npcs.find((n) => n.id === "s2n1");
ok("ベルの囚われたクモの巣がある", !!web);
st.player.x = web.x;
st.player.y = web.y;
run(5);
ok("ベルが仲間になる", !!st.fairy && st.flags["pikaJoined"]);

// 3. ペンギン（s2_penguin）との会話
const penguin = st.npcs.find((n) => n.id === "s2_penguin");
ok("困っているペンギンがいる", !!penguin);
st.player.x = penguin.x;
st.player.y = penguin.y;
run(5);
const penguinLinesBefore = els["dialogue-text"].textContent || "";
ok("ペンギンが川の水が流れてこなくて困っていると話す",
  penguin.variants[1].lines.some((l) => l.includes("川の水が ぜんぜん 流れてこない")));
closeDialogue();

// 4. 爆弾岩（s2_bomb1）の存在と押し操作
const bomb = (st.boulders || []).find((b) => b.id === "s2_bomb1" || b.sprite === "💣");
ok("上流に爆弾岩が存在する", !!bomb);
const initialBombY = bomb.y;
const initialBombX = bomb.x;

// プレイヤーを爆弾岩のすぐ南（後ろ）に配置し、北（上）へ押す
st.player.x = bomb.x;
st.player.y = bomb.y + 42; // 後ろ（南側）
st.player.dirX = 0;
st.player.dirY = -1; // 上を向く
st.player.moving = true;
H.press("ArrowUp", true);

for (let i = 0; i < 30; i++) {
  H.step(1 / 60);
}
H.press("ArrowUp", false);
ok("後ろから体当たりすると爆弾岩が前（北）へ押される", bomb.y < initialBombY, "y: " + initialBombY + " → " + bomb.y);

// 5. 敵の投石（🪨）を爆弾岩がガードすることの検証
st.player.x = bomb.x - 60; // プレイヤーは岩の横に退避
st.player.y = bomb.y;
st.bullets.push({
  x: bomb.x,
  y: bomb.y + 45,
  vx: 0,
  vy: -150,
  dmg: 1,
  sprite: "🪨",
  life: 3,
});
for (let i = 0; i < 15; i++) {
  H.step(1 / 60);
}
ok("敵の投石が爆弾岩に当たるとガードされ弾が消える", st.bullets.length === 0);
ok("ガード演出（ガード！🛡️）が発生する", st.floaters.some((f) => f.text.includes("ガード")));

// 6. 爆弾岩をせき止め巨石（ダム）まで押し進めて爆破
const damsBefore = (st.obstacles || []).filter((o) => o.dam);
ok("川をせき止めている巨石群が存在する", damsBefore.length > 0, damsBefore.length + "個");

// 爆弾岩をダムの接触範囲（y: 950付近）へ移動
bomb.x = 1100;
bomb.y = 945;
run(10); // 接近を検知して爆破イベント発動

ok("せき止め巨石の爆破が成功し、ダムの石が消滅する",
  (st.obstacles || []).filter((o) => o.dam).length === 0);
ok("川が流れるフラグ（riverFlowing）が立つ", !!st.flags["riverFlowing"]);
ok("川エリアの kind が water（青い水）に変化する",
  st.world.areas.filter((a) => a.river).every((a) => a.kind === "water"));

// 7. ペンギンのセリフ変化
st.player.x = penguin.x;
st.player.y = penguin.y;
run(5);
ok("川が流れた後、ペンギンが大喜びする",
  penguin.variants[0].lines.some((l) => l.includes("水が 戻ってきた")));
closeDialogue();

// 8. 開通した奥の出口（⛩️）への到達
const exit = st.exit;
ok("出口が存在する", !!exit);
st.player.x = exit.x;
st.player.y = exit.y;
H.step(1 / 60);
ok("出口に到達してクリアできる", !!st.exit._done);

// 結果表示
console.log("");
T.forEach(([m, n, e]) => console.log(m, " " + n, e ? " " + e : ""));
const ng = T.filter((t) => t[0] === "❌").length;
console.log("");
if (ng === 0) {
  console.log(`${T.length} / ${T.length} OK (All Passed)`);
  process.exit(0);
} else {
  console.log(`${ng} FAILED`);
  process.exit(1);
}
