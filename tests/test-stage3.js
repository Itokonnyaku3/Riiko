// 3面「静寂の湖」の本格テスト
// 武器切り替え、ブーメラン遠隔攻撃・スタン、選択肢分岐、包囲戦ミィ乱入参戦、盾持ち敵、ハナ連れ去りドラマ演出
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
  const children = [];
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
    setAttribute: () => {},
    appendChild: (ch) => { children.push(ch); return ch; },
    querySelectorAll: () => children,
    children: children,
    innerHTML: "",
  };
}

const els = {};
global.document = {
  getElementById: (id) => els[id] || (els[id] = mkEl(id)),
  createElement: (tag) => mkEl(tag),
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
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage3.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage3.js"), "utf8"));
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
    if (dialogOpen() && !H.dialogue.showingChoices) closeDialogue();
  }
};

console.log("=== 3面「静寂の湖」本格実装テスト ===");

// 1. 3面ロードと初期状態の検証
G.eraseSave();
// ベル加入フラグを事前セット（2面突破後を想定）
G._test.state.flags.pikaJoined = true;
G.start("stage3", { continue: false });

const S = H.state;
ok("3面『静寂の湖』から開始できる", S.stageId === "stage3");
ok("初期位置が湖畔の船着き場（y: 3550付近）にある", S.player && Math.abs(S.player.y - 3550) < 50);
ok("妖精ベルが最初から帯同している", S.fairy !== null && S.fairy.name === "ベル");
ok("初期状態では相棒猫ミィはまだ加入していない（null）", S.partner === null);
ok("武器リストに『けん』と『ブーメラン』を所持している", Array.isArray(S.weapons) && S.weapons.includes("sword") && S.weapons.includes("boomerang"));
ok("初期装備武器は『けん』である", S.currentWeapon === "sword");

// 2. 武器切り替え（剣 ⇔ ブーメラン）と投擲・スタン・回収テスト
H.swapWeapon();
ok("武器切り替えで現在武器がブーメラン（boomerang）になる", S.currentWeapon === "boomerang");
ok("画面ボタンの表示が🪃に変化する", els["btn-sword"].textContent === "🪃");

// ブーメラン投擲
H.face(0, -1); // 北を向く
H.useWeapon();
ok("ブーメランを投擲すると飛行オブジェクトが生成される", S.boomerang !== null);
ok("ブーメランの飛行速度が設定されている", S.boomerang.speed > 0);

// 数フレーム進めてブーメランが飛行し、戻って手元に回収されるか
for (let i = 0; i < 200 && S.boomerang; i++) {
  H.step(1 / 60);
}
ok("飛行したブーメランは弧を描いてプレイヤーの手元に自動回収される", S.boomerang === null);

// 3. 敵へのスタン攻撃テスト
const testEnemy = S.enemies.find(e => e.id === "s3_e1");
ok("西ルートに敵（コウモリ）が存在する", !!testEnemy);
// プレイヤーの北に配置してブーメランを当てる
testEnemy.x = S.player.x;
testEnemy.y = S.player.y - 70;
const prevHp = testEnemy.hp;
S.player.atkCd = 0;
H.face(0, -1);
H.useWeapon();
for (let i = 0; i < 30 && testEnemy.hp === prevHp; i++) {
  H.step(1 / 60);
}
ok("ブーメランが敵に当たるとダメージを与える", testEnemy.hp < prevHp);
ok("ブーメランが当たった敵は目を回してスタン（dizzy）状態になる", testEnemy.chargeState === "dizzy");

// 4. 盾持ち敵（シールドタートル）のガードと背後崩しテスト
const shieldEnemy = S.enemies.find(e => e.behavior === "shield");
ok("盾持ち敵（behavior: shield）が存在する", !!shieldEnemy);

// 武器を剣に戻す
H.swapWeapon();
ok("武器を剣（sword）に戻せる", S.currentWeapon === "sword");

// 正面から斬るテスト（敵が南を向いており、リイコが北を向いて正面対峙）
shieldEnemy.x = S.player.x;
shieldEnemy.y = S.player.y - 45;
shieldEnemy.dirX = 0;
shieldEnemy.dirY = 1; // 敵は南向き
shieldEnemy.chargeState = "wait";
S.player.atkCd = 0;
H.face(0, -1); // リイコは北向き（正面対決）
const shieldHpBefore = shieldEnemy.hp;
H.useWeapon();
ok("盾持ち敵の正面からの通常攻撃は盾で完全にガードされ、ダメージを受けない", shieldEnemy.hp === shieldHpBefore);

// 背後から斬るテスト（敵が北向き、リイコも北向きで背後から斬る）
shieldEnemy.dirX = 0;
shieldEnemy.dirY = -1; // 敵は北向き（背中を見せている）
S.player.atkCd = 0; // クールダウン解除
H.useWeapon();
ok("盾持ち敵の背後からの攻撃はガードを崩してダメージを与える", shieldEnemy.hp < shieldHpBefore);

// 古いブーメランを確実に手元に回収
for (let i = 0; i < 100 && S.boomerang; i++) {
  H.step(1 / 60);
}
S.boomerang = null;

// 5. 遠隔クリスタルスイッチと水門開放テスト
const sw = S.crystalSwitches.find(s => s.id === "sw_east");
ok("東ルートの孤島にクリスタルスイッチが存在する", !!sw);
const gateEast = S.gates.find(g => g.id === "gate_east");
ok("東ルートの水門ゲートが存在する", !!gateEast && !gateEast.open);

// ブーメランでスイッチを狙い撃つ
H.swapWeapon(); // ブーメランへ
S.player.x = sw.x - 15; // 旋回軌道に合わせてスイッチの真南〜南西
S.player.y = sw.y + 110;
S.player.atkCd = 0;
H.face(0, -1);
H.useWeapon();
for (let i = 0; i < 60 && !sw.active; i++) {
  H.step(1 / 60);
}
ok("遠隔クリスタルスイッチにブーメランが当たるとスイッチが起動する", sw.active === true);
ok("スイッチ起動により対応する水門（gate_east）が開く", gateEast.open === true);

// ブーメラン回収
for (let i = 0; i < 100 && S.boomerang; i++) {
  H.step(1 / 60);
}
S.boomerang = null;

// スイッチのメッセージダイアログを閉じる
closeDialogue();

// 6. 会話の選択肢分岐テスト
const introTrig = S.triggers.find(t => t.id === "trig_s3_intro");
ok("冒頭のベル会話トリガーが存在する", !!introTrig);
// トリガー位置へ移動
S.player.x = introTrig.x;
S.player.y = introTrig.y;
H.step(1 / 60);
ok("会話ウィンドウが開く", dialogOpen());

// 最終行まで進めて選択肢を表示
while (dialogOpen() && !H.dialogue.showingChoices) {
  H.dialogue.advance();
}
ok("選択肢ボタンが表示されている", H.dialogue.showingChoices === true);
ok("選択肢が2つ提示されている", H.dialogue.choices && H.dialogue.choices.length === 2);

// 選択肢1（木道）を選択
H.dialogue.selectChoice(0);
ok("選択肢1を選ぶと木道ルート（routeChoice: west）のフラグが立つ", S.flags.routeChoice === "west");

// 7. 湖上砦での包囲ピンチとミィ乱入参戦テスト
const fortTrig = S.triggers.find(t => t.id === "trig_fort_trap");
ok("湖上砦の罠トリガーが存在する", !!fortTrig);

// 砦へ進む
S.player.x = fortTrig.x;
S.player.y = fortTrig.y;
H.step(1 / 60);

// ダイアログを進めてミィの乱入カットシーンを実行
for (let i = 0; i < 60 && !S.flags.miiJoined; i++) {
  if (dialogOpen()) {
    H.dialogue.advance();
  }
  H.step(1 / 60);
}
ok("砦の包囲ピンチで相棒猫ミィが乱入し、仲間に加入する", S.flags.miiJoined === true);
ok("仲間オブジェクト（G.partner）が生成されている", S.partner !== null && S.partner.name === "ミィ");
ok("ミィのステータス（HP・攻撃力）が正しく設定されている", S.partner.hp > 0 && S.partner.attack >= 5);

// タップ戦闘（ミィへの攻撃指示）の検証
const fortEnemy = S.enemies.find(e => e.id === "s3_e_shield1" && e.alive);
ok("砦内に交戦中の敵が存在する", !!fortEnemy);
H.tapEnemy(fortEnemy.x, fortEnemy.y);
ok("画面タップでミィがターゲットを認識して攻撃状態（attack）になる", S.partner.state === "attack" && S.partner.target === fortEnemy);

// 8. 神殿奥での友達ハナ遭遇・かげマント強襲連れ去りドラマテスト
const hanaTrig = S.triggers.find(t => t.id === "trig_temple_hana");
ok("神殿最奥のハナ救出トリガーが存在する", !!hanaTrig);

// 神殿奥へ移動
S.player.x = hanaTrig.x;
S.player.y = hanaTrig.y;
H.step(1 / 60);

// ドラマカットシーン（ハナ再会 → かげマント出現 → 結界吹き飛ばし → 空中連れ去り → 決意）を進める
for (let i = 0; i < 120 && !S.flags.templeCleared; i++) {
  if (dialogOpen()) {
    H.dialogue.advance();
  }
  H.step(1 / 60);
}
ok("友達ハナとの遭遇・かげマント強襲イベントが完了する", S.flags.hanaSeen === true);
ok("かげマントがハナを連れ去り、神殿クリアフラグが立つ", S.flags.templeCleared === true);

const gateExit = S.gates.find(g => g.id === "gate_exit");
ok("北の山道（やみのしろ）への出口扉が開く", gateExit.open === true);

// 9. 出口到達と次面（4面）への引き
ok("3面の出口が存在する", !!S.exit);
S.player.x = S.exit.x;
S.player.y = S.exit.y;
H.step(1 / 60);
closeDialogue();
ok("出口に到達してクリアできる", S.exit._done === true);
ok("3面の次は4面（stage4）へ続く設定になっている", window.STAGES.stage3.next === "stage4");

// 結果出力
let err = 0;
for (const [st, n, e] of T) {
  console.log(`${st}  ${n} ${e}`);
  if (st === "❌") err++;
}
console.log(`\n${T.length - err} / ${T.length} OK ${err === 0 ? "(All Passed)" : "Failed"}`);
process.exit(err === 0 ? 0 : 1);
