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

// マップの大きさ（たてに長い森）― 娘さんの てがき地図に あわせた 形
const WORLD_W = 1400;
const WORLD_H = 2200;

// ---- 歩けるエリア（この中は 木がない） ----
//   c:[中心x, 中心y], r:半径  … まるい ひろば
//   rect:[左x, 上y, よこ幅, たて幅] … しかくい 道・ひろば
//   （地図：上のボス広場 → くねくね細道 → まん中の大きな森 → 左下の宝箱）
const WALK = [
  // 上：ボスの ひろば（大きな いびつな 広場）
  { c: [720, 380], r: 310 },
  { c: [560, 540], r: 150 },
  { c: [900, 540], r: 150 },
  { rect: [660, 120, 150, 270] },  // ボスの上：出口までの みち
  // くねくねの ほそ道（とちゅうに とびら）
  { rect: [645, 685, 160, 130] },  // せまい ところ（ここに とびら）
  { c: [775, 865], r: 95 },        // 右へ カーブ
  { c: [650, 965], r: 95 },        // 左へ カーブ
  { rect: [600, 945, 160, 120] },  // まん中の 森へ
  // まん中の 大きな 森（いびつ・右下に がけ）
  { c: [720, 1260], r: 290 },
  { c: [470, 1160], r: 150 },      // 左うで（がけ）
  { c: [1060, 1430], r: 230 },     // 右下の ふくらみ（がけ・てきの むれ）
  { c: [1190, 1260], r: 140 },     // 右へ のびる
  // 左下の たからばこへ おりる ほそ道
  { rect: [360, 1280, 150, 270] },
  { rect: [300, 1520, 160, 250] },
  // 左下：たからの ポケット
  { c: [300, 1870], r: 185 },
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

  // しゅじんこう（左下の ポケットから スタート）
  player: { x: 330, y: 1860, sprite: "👧", name: "リイコ" },

  // あいぼう（ねこ）
  partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },

  // しょうがいぶつ（森の木で うめる）
  obstacles: makeForest(),

  // かざり（あるくだけ・ぶつからない）
  decorations: [
    { x: 250, y: 1780, sprite: "🌼" },
    { x: 380, y: 1930, sprite: "🌸" },
    { x: 470, y: 1120, sprite: "🌷" },
    { x: 720, y: 1250, sprite: "🌼" },
    { x: 980, y: 1350, sprite: "🍄" },
    { x: 1120, y: 1470, sprite: "🌸" },
    { x: 1180, y: 1560, sprite: "🪨" },
    { x: 900, y: 1520, sprite: "🪨" },
    { x: 720, y: 300, sprite: "🌷" },
  ],

  // てき（ねこっぽい敵）… behavior: patrol / chase / shooter
  //   ▼数字を変えると 強さ・動きを 調整できます（TUNING）
  //   （地図の「まん中〜右下」に かたまっている 丸たち＝てきの むれ）
  enemies: [
    { id: "e1", x: 700, y: 1260, sprite: "😾", name: "いたずらネコ", maxHp: 14, attack: 3, behavior: "patrol", speed: 40, patrolRange: 110 },
    { id: "e2", x: 930, y: 1330, sprite: "🙀", name: "びっくりネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 55, sight: 240 },
    { id: "e3", x: 1080, y: 1450, sprite: "😾", name: "やんちゃネコ", maxHp: 16, attack: 3, behavior: "patrol", speed: 45, patrolRange: 120 }, // 右下の宝を まもる
    { id: "e4", x: 1190, y: 1260, sprite: "🙀", name: "みはりネコ", maxHp: 20, attack: 3, behavior: "chase", speed: 58, sight: 220 },
    { id: "e5", x: 455, y: 1180, sprite: "😼", name: "こそこそネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 52, sight: 210 }, // 左うでの宝を まもる
    { id: "boss", x: 720, y: 340, sprite: "😼", name: "ボスネコ", maxHp: 36, attack: 4, behavior: "shooter", speed: 22, sight: 360, shootInterval: 1.5, bulletSpeed: 150, bulletDamage: 2 },
  ],

  // たからばこ（ぶつかると あく）。key があると アイテムとして たまる
  chests: [
    { id: "c1", x: 195, y: 1955, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（1こめ）" },
    { id: "c2", x: 1080, y: 1470, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（右下・やんちゃネコの おく）" },
    { id: "c3", x: 440, y: 1120, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（左うで・こそこそネコの おく）" },
  ],

  // とびら（ほうせきを 3こ あつめると あく）… くねくね道の せまい ところ
  gates: [
    {
      id: "bossgate",
      x: 720,
      y: 745,
      r: 46,
      requireKey: "ほうせき",
      requireCount: 3,
      hudIcon: "💎",
      wall: wallRow(618, 822, 745, 24, 18, "🧱"), // 道を ふさぐ かべ
      lockedLines: [
        "がんじょうな とびら。ほうせきの あなが 3つ ある。",
        "いま {have} / {need} こ。ほうせきを あつめよう！",
      ],
      openLines: ["カチッ！ ほうせきが 3つ そろって、とびらが ひらいた！✨"],
    },
  ],

  // 出口（ボスを たおすと つかえる）… 地図いちばん上の「→次のステージへ」
  exit: {
    x: 760,
    y: 150,
    r: 46,
    lines: ["ここから つぎの ステージへ！", "（つぎの ステージは これから 作ります。つづく！）"],
  },

  // とうじょうじんぶつ（ヒントをくれる住人）
  npcs: [
    {
      id: "n1",
      x: 400,
      y: 1790,
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
      x: 720,
      y: 1150,
      sprite: "🐰",
      name: "こうさぎ",
      lines: [
        "ほうせきは あと 2つ！",
        "1つは 右下のほう、やんちゃネコの おくの たからばこ。",
        "もう1つは 左うでのほう、こそこそネコの おくに あるよ。",
        "ネコが こわかったら、ミィを タップして たたかってもらってね。",
      ],
    },
    {
      id: "n3",
      x: 655,
      y: 965,
      sprite: "🦔",
      name: "はりねずみ",
      lines: [
        "このさきの とびらが ボスへの 入り口だよ。",
        "ほうせきが 3つ そろえば、ひとりでに ひらくんだ。",
      ],
    },
  ],
};
