// 2面「ささやきの谷」の川さかのぼり・迂回路・滝・ペンギン・爆弾岩押し・大爆発・水流カットシーンのテスト
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

// 2. 登れない2か所の滝の存在と枯れ滝連動
const wf1 = (st.obstacles || []).find((o) => o.id === "wf1" || o.sprite === "waterfall");
const wf2 = (st.obstacles || []).find((o) => o.id === "wf2" || (o.sprite === "waterfall" && o.y < 2500));
ok("下流に登れない滝1（waterfall）が存在する", !!wf1 && wf1.r > 0);
ok("中流に登れない滝2（waterfall）が存在する", !!wf2 && wf2.r > 0);

// 川の流路の連続性検証（y: 1350 から 3300 まで 50px ごとに川エリアが存在すること）
let gapFound = false;
for (let y = 1360; y <= 3300; y += 40) {
  const inRiver = riverAreas.some((a) => {
    if (a.shape === "rect") {
      return 1100 >= a.x && 1100 <= a.x + a.w && y >= a.y && y <= a.y + a.h;
    } else if (a.shape === "circle") {
      return Math.hypot(1100 - a.x, y - a.y) <= a.r;
    }
    return false;
  });
  if (!inRiver) {
    gapFound = true;
    break;
  }
}
ok("川の流路（最上流〜最下流）が隙間なく連続している", !gapFound);

// 川の流路中央（x: 1050〜1150）に滝や橋以外の障害物（岩の壁）が存在しないこと
const midRiverObstacles = (st.obstacles || []).filter((o) => {
  return o.x >= 1060 && o.x <= 1140 && o.y >= 1400 && o.y <= 3300 &&
    !o.sprite.startsWith("waterfall") && o.sprite !== "bridge";
});
ok("川の中央に不要な岩や障害物が存在しない", midRiverObstacles.length === 0, midRiverObstacles.length + "個");

// 3. 右岸迂回路（クモの巣 s2n1）でベルを救出
const web = st.npcs.find((n) => n.id === "s2n1");
ok("右岸迂回路にベルの囚われたクモの巣がある", !!web && web.x > 1500);
st.player.x = web.x;
st.player.y = web.y;
run(5);
ok("ベルが仲間になる", !!st.fairy && st.flags["pikaJoined"]);

// 4. 川をまたぐ橋とペンギン（s2_penguin）
const penguin = st.npcs.find((n) => n.id === "s2_penguin");
ok("オアシスに困っているペンギンがいる", !!penguin);
st.player.x = penguin.x;
st.player.y = penguin.y;
run(5);
ok("ペンギンが川の水が流れてこなくて困っていると話す",
  penguin.variants[1].lines.some((l) => l.includes("川の水が ぜんぜん 流れてこない")));
closeDialogue();

// 5. 敵の溜め投石時にベルが「爆弾岩の陰に隠れて！」と警告すること
const thrower = st.enemies.find((e) => e.id === "s2e_thrower1" || e.name.includes("ザル"));
ok("投石敵（いしなげザル）が存在する", !!thrower);
if (thrower) {
  thrower.barrageCd = 0; // すぐに大技を発動可能に
  st.player.x = thrower.x + 100;
  st.player.y = thrower.y;
  run(2);
  ok("敵の溜め動作時、ベルが『爆弾岩の陰に隠れて！』と警告する",
    (st.fairy && st.fairy.say.includes("爆弾岩の陰に隠れて")) ||
    st.floaters.some((f) => f.text.includes("爆弾岩の陰に隠れて")));
}

// 6. 爆弾岩（s2_bomb1）の存在と押し操作
const bomb = (st.boulders || []).find((b) => b.id === "s2_bomb1" || b.sprite === "💣");
ok("上流広場の北に爆弾岩が存在する", !!bomb);
const initialBombY = bomb.y;

// プレイヤーを爆弾岩の後ろ（南側）に配置し、北へ押す
st.player.x = bomb.x;
st.player.y = bomb.y + 42;
st.player.dirX = 0;
st.player.dirY = -1;
st.player.moving = true;
H.press("ArrowUp", true);
for (let i = 0; i < 30; i++) H.step(1 / 60);
H.press("ArrowUp", false);
ok("後ろから体当たりすると爆弾岩が前へ押される", bomb.y < initialBombY, "y: " + initialBombY + " → " + bomb.y);

// 7. 敵の投石が爆弾岩に当たった際「ガード！」テキストが出ないこと
st.floaters = [];
st.bullets.push({
  x: bomb.x,
  y: bomb.y + 45,
  vx: 0,
  vy: -150,
  dmg: 1,
  sprite: "🪨",
  life: 3,
});
for (let i = 0; i < 15; i++) H.step(1 / 60);
ok("敵の投石が爆弾岩に当たると消える", st.bullets.length === 0);
ok("説明テキスト『ガード！』は表示されない（不要になったため削除）",
  !st.floaters.some((f) => f.text.includes("ガード")));

// 8. 爆弾岩をせき止め巨石（ダム）に接触させるとカウントダウンが始まる
const damsBefore = (st.obstacles || []).filter((o) => o.dam);
ok("川をせき止めている巨石群が存在する", damsBefore.length > 0, damsBefore.length + "個");

// ダムの接触位置へ移動
bomb.x = damsBefore[0].x;
bomb.y = damsBefore[0].y + 45;
run(5);

ok("ダム接触時、ベルが『爆発させるから遠くに逃げて！』と言う",
  (st.fairy && st.fairy.say.includes("遠くに逃げて")) ||
  st.floaters.some((f) => f.text.includes("遠くに逃げて")));
ok("カウントダウンが開始される", bomb.countdown != null && bomb.countdown > 0);

// 9. カウントダウン進行と爆発
st.player.x = bomb.x;
st.player.y = bomb.y + 10; // 爆発直前に至近距離に配置（5ダメージ検証のため）
st.player.hp = 10; // 耐えられるよう一時的にHPを増やす
st.player.maxHp = 10;

// カウントダウンを0にして爆発を発動
bomb.countdown = 0.05;
run(10);

ok("爆発エフェクトに触れると主人公が5ダメージを受ける", st.player.hp <= 5, "HP: 10 → " + st.player.hp);
ok("せき止め巨石が吹き飛び、ダムの石が消滅する", (st.obstacles || []).filter((o) => o.dam).length === 0);
ok("川が流れるフラグ（riverFlowing）が立つ", !!st.flags["riverFlowing"]);
ok("川エリアの kind が water（青い水）に変化する",
  st.world.areas.filter((a) => a.river).every((a) => a.kind === "water"));

// 10. 水流カットシーンとペンギンの流され演出
run(450); // カットシーン進行・完了
closeDialogue();

// 11. ペンギンのセリフ変化
st.player.x = penguin.x;
st.player.y = penguin.y;
run(5);
ok("川が流れた後、ペンギンが大喜びする",
  penguin.variants[0].lines.some((l) => l.includes("水が 戻ってきた")));
closeDialogue();

// 12. 開通した奥の出口（⛩️）への到達
const exit = st.exit;
ok("出口が存在する", !!exit);
st.player.x = exit.x;
st.player.y = exit.y;
run(10);
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
