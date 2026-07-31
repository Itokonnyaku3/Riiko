/*
 * =========================================================
 *  シナリオ（おはなし）データ  ―  あたらしいマップ（stage2）
 * =========================================================
 *  ◆マップ（じめん・森・かざり）は マップ作成ツールで 作ります◆
 *      → tools/map-editor.html を ブラウザで ひらく
 *      → できた ファイルを js/maps/◯◯.js に おく
 *      → index.html で よみこみ、下の window.MAPS["◯◯"] を さしかえる
 *  ここでは そのマップを よみこんで、てき・たからばこ・セリフを のせます。
 * =========================================================
 */

// あいことば（かんたんな目隠し。ほんかくてきな鍵ではありません）
const GAME_CONFIG = { password: "neko" };

// マップ作成ツールで 作った マップを よみこむ
const MAP = MapData.build(window.MAPS["stage2"]);

// よこ一れつに かべを ならべる（とびら用）
function wallRow(x1, x2, y, gap, r, sprite) {
  const a = [];
  for (let x = x1; x <= x2; x += gap) a.push({ x: x, y: y, r: r, sprite: sprite });
  return a;
}

const SCENARIO = {
  title: "ねこの相棒とふしぎの島 ― あたらしいマップ",

  // ---- ここから 3つは マップ作成ツールの データ ----
  world: MAP.world,
  obstacles: MAP.obstacles, // 森の木・かべ（じどうで うまる）
  decorations: MAP.decorations, // かざり（ぶつからない）

  // しゅじんこう（右下の 大部屋から スタート）
  player: { x: 760, y: 1720, sprite: "👧", name: "リイコ" },
  partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },

  // てき（道ぞいに 配置）… behavior: patrol / chase / shooter
  enemies: [
    { id: "e1", x: 900, y: 1770, sprite: "😾", name: "いたずらネコ", maxHp: 14, attack: 3, behavior: "patrol", speed: 40, patrolRange: 90 },
    { id: "e2", x: 351, y: 1342, sprite: "🙀", name: "びっくりネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 52, sight: 230 },
    { id: "e3", x: 620, y: 960, sprite: "😾", name: "やんちゃネコ", maxHp: 16, attack: 3, behavior: "patrol", speed: 45, patrolRange: 120 },
    { id: "e4", x: 1200, y: 1440, sprite: "🙀", name: "みはりネコ", maxHp: 20, attack: 3, behavior: "chase", speed: 56, sight: 220 }, // 右の宝を まもる
    { id: "e5", x: 520, y: 1870, sprite: "😼", name: "こそこそネコ", maxHp: 18, attack: 3, behavior: "chase", speed: 50, sight: 200 }, // 下の宝を まもる
    { id: "boss", x: 1010, y: 810, sprite: "😼", name: "ボスネコ", maxHp: 36, attack: 4, behavior: "shooter", speed: 20, sight: 340, shootInterval: 1.5, bulletSpeed: 150, bulletDamage: 2 },
  ],

  // たからばこ（ぶつかると あく）。key があると アイテムとして たまる
  chests: [
    { id: "c1", x: 500, y: 1980, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（1こめ）" },
    { id: "c2", x: 240, y: 1130, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（左の おく）" },
    { id: "c3", x: 1250, y: 1400, key: "ほうせき", item: "💎 ほうせき", message: "たからばこを あけた！『ほうせき💎』を てにいれた！（右・みはりネコの おく）" },
  ],

  // とびら（ほうせきを 3こ あつめると あく）… 頂上ボスへの 首の ところ
  gates: [
    {
      id: "bossgate",
      x: 1010,
      y: 890,
      r: 46,
      requireKey: "ほうせき",
      requireCount: 3,
      hudIcon: "💎",
      wall: wallRow(930, 1130, 890, 24, 18, "🧱"),
      lockedLines: [
        "がんじょうな とびら。ほうせきの あなが 3つ ある。",
        "いま {have} / {need} こ。ほうせきを あつめよう！",
      ],
      openLines: ["カチッ！ ほうせきが 3つ そろって、とびらが ひらいた！✨"],
    },
  ],

  // 出口（ボスを たおすと つかえる）
  exit: {
    x: 1013,
    y: 765,
    r: 46,
    lines: ["ここから つぎの ステージへ！", "（つづく！）"],
  },

  // とうじょうじんぶつ（ヒントをくれる住人）
  npcs: [
    {
      id: "n1",
      x: 840,
      y: 1740,
      sprite: "🧙",
      name: "もりの おばあさん",
      lines: [
        "おや、リイコと ミィだね。この森の おくに ボスネコが いるよ。",
        "ボスへの とびらは、ほうせき💎を 3つ あつめると あくんじゃ。",
        "1つめは この へやの 下、みなみの たからばこに あるよ。",
        "うごく：ボタン／WASD、てきや じめんを タップ：ミィが うごくよ。",
      ],
    },
    {
      id: "n2",
      x: 500,
      y: 960,
      sprite: "🐰",
      name: "こうさぎ",
      lines: [
        "ほうせきは あと 2つ！",
        "1つは 左のおく、もう1つは 右の みはりネコの おくに あるよ。",
        "ネコが こわかったら、ミィを タップして たたかってもらってね。",
      ],
    },
    {
      id: "n3",
      x: 962,
      y: 990,
      sprite: "🦔",
      name: "はりねずみ",
      lines: [
        "このうえの とびらが ボスへの 入り口だよ。",
        "ほうせきが 3つ そろえば、ひとりでに ひらくんだ。",
      ],
    },
  ],
};
