/*
 * =========================================================
 *  シナリオ（おはなし）データ  ―  ステージ1「はじまりの森」
 * =========================================================
 *  ここを書きかえると、あたらしいおはなしが作れます。
 *  プログラム（js/engine.js）は さわらなくて大丈夫。
 *
 *  ◆このステージのながれ◆
 *    下から スタート → 住人に ヒントを聞く
 *    → 森の たからばこから「ほうせき💎」を 3こ あつめる
 *    → ボスへの「とびら」が ひらく → ボスを たおす
 *    → 上の 出口から つぎのステージへ
 *
 *  ◆マップの考えかた◆
 *    「歩けるところ(WALK)」だけを 決めておいて、
 *    それ いがいは ぜんぶ 木で うめます（森が かべになる）。
 * =========================================================
 */

// あいことば（かんたんな目隠し。ほんかくてきな鍵ではありません）
const GAME_CONFIG = {
  password: "neko", // ←ここを好きなあいことばに変えられます
};

// マップの大きさ（たてに長い森）
const WORLD_W = 1400;
const WORLD_H = 2200;

// ---- 歩けるエリア（この中は 木がない） ----
//   c:[中心x, 中心y], r:半径  … まるい ひろば
//   rect:[左x, 上y, よこ幅, たて幅] … しかくい 道・ひろば
const WALK = [
  { c: [700, 360], r: 300 },       // ボスの ひろば（いちばん上）
  { rect: [630, 120, 140, 300] },  // ボスの上：出口までの みち
  { rect: [620, 560, 160, 460] },  // ボスへの ほそ道（とちゅうに とびら）
  { rect: [300, 980, 900, 560] },  // まん中の 森ひろば（てきがたくさん）
  { c: [1120, 1060], r: 130 },     // 右の たからポケット
  { c: [380, 1050], r: 120 },      // 左の たからポケット
  { rect: [300, 1500, 240, 340] }, // 左の ほそ道（下へ）
  { rect: [250, 1780, 520, 300] }, // スタートの ひろば（下）
  { c: [250, 1900], r: 160 },      // たからの へや（左下）
];

function inWalk(x, y, margin) {
  for (const w of WALK) {
    if (w.c) {
      if (Math.hypot(x - w.c[0], y - w.c[1]) < w.r + margin) return true;
    } else {
      const [rx, ry, rw, rh] = w.rect;
      if (x > rx - margin && x < rx + rw + margin && y > ry - margin && y < ry + rh + margin)
        return true;
    }
  }
  return false;
}

// 森をつくる：歩けるところ いがいを 木で うめる
function makeForest() {
  const trees = [];
  const gap = 58;
  const r = 26;
  for (let x = 20; x < WORLD_W; x += gap) {
    for (let y = 20; y < WORLD_H; y += gap) {
      const jx = ((x * 73 + y * 151) % 29) - 14; // 少しズラして自然に
      const jy = ((x * 151 + y * 73) % 29) - 14;
      const tx = x + jx,
        ty = y + jy;
      if (!inWalk(tx, ty, 24)) trees.push({ x: tx, y: ty, r: r, sprite: "🌳" });
    }
  }
  return trees;
}

// よこ一れつに かべを ならべる（とびら用）
function wallRow(x1, x2, y, gap, r, sprite) {
  const a = [];
  for (let x = x1; x <= x2; x += gap) a.push({ x: x, y: y, r: r, sprite: sprite });
  return a;
}

const SCENARIO = {
  title: "ねこの相棒とふしぎの島 ― ステージ1 はじまりの森",

  world: { width: WORLD_W, height: WORLD_H, ground: "#8fca7a" },

  // しゅじんこう（下からスタート）
  player: { x: 600, y: 1950, sprite: "👧", name: "リイコ" },

  // あいぼう（ねこ）
  partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },

  // しょうがいぶつ（森の木で うめる）
  obstacles: makeForest(),

  // かざり（あるくだけ・ぶつからない）
  decorations: [
    { x: 560, y: 1900, sprite: "🌼" },
    { x: 680, y: 1850, sprite: "🌸" },
    { x: 500, y: 1250, sprite: "🌷" },
    { x: 820, y: 1350, sprite: "🌼" },
    { x: 980, y: 1200, sprite: "🍄" },
    { x: 700, y: 1450, sprite: "🌸" },
    { x: 700, y: 300, sprite: "🌷" },
  ],

  // てき（ねこっぽい敵）… behavior: patrol / chase / shooter
  //   ▼数字を変えると 強さ・動きを 調整できます（TUNING）
  enemies: [
    { id: "e1", x: 520, y: 1150, sprite: "😾", name: "いたずらネコ", maxHp: 14, attack: 3, behavior: "patrol", speed: 40, patrolRange: 110 },
    { id: "e2", x: 760, y: 1200, sprite: "🙀", name: "びっくりネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 55, sight: 240 },
    { id: "e3", x: 1000, y: 1220, sprite: "😾", name: "やんちゃネコ", maxHp: 16, attack: 3, behavior: "patrol", speed: 45, patrolRange: 120 },
    { id: "e4", x: 1090, y: 1080, sprite: "🙀", name: "みはりネコ", maxHp: 20, attack: 3, behavior: "chase", speed: 58, sight: 220 }, // 右の宝を まもる
    { id: "e5", x: 440, y: 1120, sprite: "😼", name: "こそこそネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 52, sight: 210 }, // 左の宝を まもる
    { id: "boss", x: 700, y: 320, sprite: "😼", name: "ボスネコ", maxHp: 36, attack: 4, behavior: "shooter", speed: 22, sight: 360, shootInterval: 1.5, bulletSpeed: 150, bulletDamage: 2 },
  ],

  // たからばこ（ぶつかると あく）。key があると アイテムとして たまる
  chests: [
    { id: "c1", x: 230, y: 1900, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（1こめ）" },
    { id: "c2", x: 1120, y: 1050, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（みはりネコの おく）" },
    { id: "c3", x: 370, y: 1030, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！" },
  ],

  // とびら（ほうせきを 3こ あつめると あく）
  gates: [
    {
      id: "bossgate",
      x: 700,
      y: 740,
      r: 44,
      requireKey: "ほうせき",
      requireCount: 3,
      hudIcon: "💎",
      wall: wallRow(612, 788, 740, 24, 18, "🧱"), // 道を ふさぐ かべ
      lockedLines: [
        "がんじょうな とびら。ほうせきの あなが 3つ ある。",
        "いま {have} / {need} こ。ほうせきを あつめよう！",
      ],
      openLines: ["カチッ！ ほうせきが 3つ そろって、とびらが ひらいた！✨"],
    },
  ],

  // 出口（ボスを たおすと つかえる）
  exit: {
    x: 700,
    y: 160,
    r: 46,
    lines: ["ここから つぎの ステージへ！", "（つぎの ステージは これから 作ります。つづく！）"],
  },

  // とうじょうじんぶつ（ヒントをくれる住人）
  npcs: [
    {
      id: "n1",
      x: 640,
      y: 1965,
      sprite: "🧙",
      name: "もりの おばあさん",
      lines: [
        "おや、リイコと ミィだね。この森の おくに ボスネコが いるよ。",
        "ボスへの とびらは、ほうせき💎を 3つ あつめると あくんじゃ。",
        "1つめは すぐ そこ、左下の たからばこに あるよ。",
        "うごく：ボタン／WASD、てきや じめんを タップ：ミィが うごくよ。",
      ],
    },
    {
      id: "n2",
      x: 760,
      y: 1250,
      sprite: "🐰",
      name: "こうさぎ",
      lines: [
        "ほうせきは あと 2つ！",
        "1つは 右のほう、みはりネコの おくの たからばこ。",
        "もう1つは 左のほうの たからばこに あるよ。",
        "ネコが こわかったら、ミィを タップして たたかってもらってね。",
      ],
    },
    {
      id: "n3",
      x: 700,
      y: 870,
      sprite: "🦔",
      name: "はりねずみ",
      lines: [
        "このさきの とびらが ボスへの 入り口だよ。",
        "ほうせきが 3つ そろえば、ひとりでに ひらくんだ。",
      ],
    },
  ],
};
