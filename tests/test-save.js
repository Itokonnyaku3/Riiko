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
// ブラウザの きおくそうち（localStorage）の ふり
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};

// パーツの 絵の 一らん（Node には 画像が ないので 絵文字で えがかれる）
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

// カットシーンが おわるまで すすめる
const finishCutscene = (max) => {
  const st = G._test.state;
  for (let i = 0; i < (max || 2000) && st.cut; i++) {
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

// ===== 1.5) プロローグ（ハナが さらわれる）=====
ok("プロローグが はじまる", !!st.cut && st.paused === true);
let sawHana = false;
let sawMant = false;
for (let i = 0; i < 3000 && st.cut; i++) {
  G._test.step(1 / 60);
  if (st.actors.some((a) => a.id === "hana")) sawHana = true;
  if (st.actors.some((a) => a.id === "mant")) sawMant = true;
  if (dialogOpen()) closeDialogue();
}
ok("ハナが 出てくる", sawHana);
ok("かげマントが 出てくる", sawMant);
ok("プロローグが おわると うごける", st.cut === null && st.paused === false);
ok("プロローグは 1回だけ", st.flags["prologueDone"] === true);
ok("プロローグの 人は 消えて いる", st.actors.length === 0);

// ===== 2) フラグ・宝箱・てき を すすめる =====
st.player.x = 510; st.player.y = 2530; G._test.step(1 / 60); closeDialogue();
ok("たからばこを あけた", st.opened["c1"] === true && st.items["メダル"] === 1);

const e1 = st.enemies.filter((e) => e.id === "e1")[0];
e1.hp = 0;
e1.x = 1200; e1.y = 3000;
st.player.x = 1160; st.player.y = 3000; G._test.face(1, 0); st.player.atkCd = 0;
G._test.swing();
ok("てきを たおすと おぼえる", st.defeated["e1"] === true, JSON.stringify(st.defeated));

// ===== 3) チェックポイント =====
//   直前に 斬って いる ので、ヒットストップが おわるまで すこし すすめる
st.player.x = 1400; st.player.y = 3000; run(10);
ok("チェックポイントを 通ると 復帰地点が かわる",
  Math.abs(st.respawn.y - 3000) < 1, JSON.stringify(st.respawn));
// やられても そこから
st.player.invT = 0;
G._test.hurt(9);
for (let i = 0; i < 300 && st.downT > 0; i++) G._test.step(1 / 60);
ok("やられると チェックポイントから 再かいし",
  Math.abs(st.player.y - 3000) < 1 && st.player.hp === st.player.maxHp,
  Math.round(st.player.x) + "," + Math.round(st.player.y));
ok("やられても たからばこ・たおした てきは そのまま",
  st.opened["c1"] === true && st.defeated["e1"] === true);

// ===== 4) トリガーと カットシーン =====
st.player.x = 1400; st.player.y = 2060; G._test.step(1 / 60);
ok("抜け道を こえると フラグが 立つ", st.flags["passedSecret"] === true);
closeDialogue();

st.player.x = 1420; st.player.y = 860; G._test.step(1 / 60);
ok("高台で フラグが 立つ", st.flags["sawCastle"] === true);
ok("カットシーンが はじまる", !!st.cut && st.paused === true);
const camBefore = { x: st.cam.x, y: st.cam.y };
// セリフを おくりながら さいごまで。とちゅうの ようすを 見る
let camMoved = false;
let sawMant2 = false;
for (let i = 0; i < 3000 && st.cut; i++) {
  G._test.step(1 / 60);
  if (st.cam.y < camBefore.y - 20) camMoved = true;
  if (st.actors.some((a) => a.id === "mant2")) sawMant2 = true;
  if (dialogOpen()) closeDialogue();
}
ok("カメラが しろの ほうへ 動く", camMoved, "y " + Math.round(camBefore.y) + " から");
ok("かげマントが すがたを 見せる（次の面への ひき）", sawMant2);
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
st.player.x = 1420; st.player.y = 660;
G._test.step(1 / 60);
ok("出口で かいわが 出る", st.paused === true && dialogOpen());
closeDialogue();
st = G._test.state;
ok("2面へ すすむ", st.stageId === "stage2", st.stageId);
ok("2面の なまえが 出る", st.titleText.indexOf("ささやき") >= 0, st.titleText);
ok("2面でも 仲間は いない", st.partner === null);
ok("2面に すすんだ ことが セーブされる", JSON.parse(store["riiko_save_v1"]).stageId === "stage2");

// ===== 7.5) ヒント（Ph3.5）=====
G.eraseSave();
G.start();
st = G._test.state;
finishCutscene();
// まだ タロに 会って いない → 1つめの ヒント
st.stuckT = 0; st.hintLv = 0;
st.floaters.length = 0;
G._test.stuck(91);
G._test.step(1 / 60);
ok("90びょうで ヒント1が 出る", st.hintLv === 1 && st.floaters.length > 0,
  st.floaters.length ? st.floaters[st.floaters.length - 1].text : "なし");
const h1 = st.floaters[st.floaters.length - 1].text;
G._test.stuck(181);
G._test.step(1 / 60);
ok("180びょうで ヒント2（もっと くわしく）", st.hintLv === 2);
const h2 = st.floaters[st.floaters.length - 1].text;
ok("ヒント1と2は ちがう ことば", h1 !== h2, h1 + " → " + h2);
G._test.stuck(301);
G._test.step(1 / 60);
ok("300びょうで ヒント3＋行き先が 光る", st.hintLv === 3 && !!st.guide,
  JSON.stringify(st.guide));

// すすむと ヒントの タイマーが もどる
st.player.x = 1400; st.player.y = 3720; run(6); // タロに 会う
ok("話が すすむと ヒントが もとに もどる", st.hintLv === 0 && st.guide === null);
ok("タロに 会った フラグ", st.flags["metTaro"] === true);

// ★もう一度 話しかける ほど くわしく なる（D2b）
const taro = st.npcs.filter((n) => n.id === "n2")[0];
const say = () => {
  st.player.x = taro.x + 200; st.player.y = taro.y; G._test.step(1 / 60);
  st.player.x = taro.x; st.player.y = taro.y; G._test.step(1 / 60);
  const t = els["dialogue-text"].textContent;
  closeDialogue();
  return t;
};
const t2 = say();
const t3 = say();
ok("2回目の タロは 言うことが かわる", t2 !== t3, t2.slice(0, 12) + " / " + t3.slice(0, 12));
ok("3回目は もっと はっきり 言う", t3.indexOf("はっきり") >= 0 || t3.indexOf("まん中") >= 0, t3);

// ===== 7.6) くじけない しくみ（Ph5）=====
const foe = st.enemies.filter((e) => e.id === "e3")[0];
const hp0 = foe.maxHp, atk0 = foe.attack, patk0 = st.player.attack;
G._test.killedBy("e3");
st.player.invT = 0; G._test.hurt(9);
for (let i = 0; i < 200 && st.downT > 0; i++) G._test.step(1 / 60);
ok("1回目は まだ かわらない", foe.maxHp === hp0 && st.player.attack === patk0);
G._test.killedBy("e3");
st.player.invT = 0; G._test.hurt(9);
for (let i = 0; i < 200 && st.downT > 0; i++) G._test.step(1 / 60);
ok("2回 やられると てきが こっそり よわくなる",
  foe.maxHp < hp0 && foe.attack < atk0, hp0 + "→" + foe.maxHp + " / こうげき " + atk0 + "→" + foe.attack);
ok("2回目は ことばを 出さない（だまって やさしく）", st.player.attack === patk0);
G._test.killedBy("e3");
st.player.invT = 0; G._test.hurt(9);
for (let i = 0; i < 200 && st.downT > 0; i++) G._test.step(1 / 60);
ok("3回目は 味方が つよく なった ように 見せる", st.player.attack > patk0,
  "こうげき " + patk0 + "→" + st.player.attack);
const msgs = st.floaters.map((f) => f.text).join(" ");
ok("「てきが よわく なった」とは 言わない", msgs.indexOf("よわ") < 0, msgs);

// おたすけモード
G._test.helpMode(true);
ok("おたすけモードで ハートが ふえる", st.player.maxHp >= 5, "ハート " + st.player.maxHp);
st.stuckT = 0; st.hintLv = 0;
G._test.stuck(46);
G._test.step(1 / 60);
ok("おたすけモードは ヒントが 早く 出る", st.hintLv >= 1);
G._test.helpMode(false);

// ===== 8) さいしょから =====
G.eraseSave();
ok("セーブを けせる", G.hasSave() === false);
G.start();
st = G._test.state;
ok("けした あとは 1面から", st.stageId === "stage1");
ok("けした あとは もちものも ゼロ", Object.keys(st.items).length === 0);

// ===== 9) 面の選択・指定開始 と 岩場スタック防止 =====
const stageList = G.getStageList();
ok("面の 一らんが 取れる", Array.isArray(stageList) && stageList.length >= 2);
ok("1面と2面が 入って いる", stageList.some((s) => s.id === "stage1") && stageList.some((s) => s.id === "stage2"));

// 2面を えらんで 開始
G.start("stage2", { continue: false });
st = G._test.state;
ok("えらんだ面（2面）から はじまる", st.stageId === "stage2");
ok("2面の 初期位置に いる", st.player.x === 1100 && st.player.y === 1600);

// 岩場に埋まった昔のセーブデータ（550, 800）のシミュレーション
localStorage.setItem("riiko_save", JSON.stringify({
  v: 1,
  stageId: "stage2",
  flags: {},
  talks: {},
  items: {},
  opened: {},
  defeated: {},
  respawn: { x: 550, y: 800 }, // 新マップでは岩場の中
}));
const saveInfo = G.getSaveInfo();
ok("セーブ情報が 取れる", saveInfo && saveInfo.stageId === "stage2" && saveInfo.title.indexOf("2面") >= 0);

// つづきから再開 → 岩場に埋まらず安全な初期位置に自動復帰すること
G.start(null, { continue: true });
st = G._test.state;
ok("岩場に埋まったセーブでも初期位置に安全復帰", st.player.x === 1100 && st.player.y === 1600);
const nearestObstacle = st.obstacles
  .map((o) => Math.hypot(o.x - st.player.x, o.y - st.player.y) - o.r - 18)
  .sort((a, b) => a - b)[0];
ok("プレイヤーの 周囲に 障害物の めりこみがない", nearestObstacle > 0);


// まとめ
let ng = 0;
for (const r of T) { console.log(r[0] + "  " + r[1] + "  " + r[2]); if (r[0] === "❌") ng++; }
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng === 0 ? 0 : 1);
