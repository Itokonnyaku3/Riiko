/*
 * =========================================================
 *  シナリオ（おはなし）データ  ―  1面「はじまりの森」
 * =========================================================
 *  ◆マップ（じめん・森・かざり）は マップ作成ツールで 作ります◆
 *      → tools/map-editor.html を ブラウザで ひらく
 *      → 「📚 よむ」で stage1 を よみこむ ／ 「💾 ファイルに だす」で 書きだす
 *      → できた ファイルを js/maps/stage1.js に おく
 *  ここでは そのマップを よみこんで、てき・たからばこ・セリフを のせます。
 *
 *  ぜんたいの けいかく → docs/GAME_PLAN.md
 * =========================================================
 *  1面の ながれ
 *    村（ハナが さらわれる）
 *      → 森の入口：きこりの タロが 目げき じょうほうを くれる  ★ヒント
 *      → 森の広場（てきと たたかう れんしゅう）
 *      → 三叉路：左・右は はずれ。足あとの ある まん中が 正かい  ★なぞ
 *      → ふたつの 大きな いわ の あいだ＝見た目は 森だが 通り抜けられる  ★なぞの かなめ
 *      → 森の おく
 *      → 見晴らしの 高台：遠くに「やみの しろ」が 見える ＋ ハナの こえ
 * =========================================================
 */

// あいことば（かんたんな目隠し。ほんかくてきな鍵ではありません）
const GAME_CONFIG = { password: "neko" };

// マップ作成ツールで 作った マップを よみこむ
const MAP = MapData.build(window.MAPS["stage1"]);

// ===== キャラの え（4ほうこう × 2コマ）=====
//   絵を さしかえたい ときは、この ファイルの ばしょを かえるだけ。
//   walk を 書かない キャラは、いままでどおり 絵文字で うごきます。
const PLAYER_WALK = {
  down: ["assets/player/down1.png", "assets/player/down2.png"],
  up: ["assets/player/up1.png", "assets/player/up2.png"],
  left: ["assets/player/left1.png", "assets/player/left2.png"],
  right: ["assets/player/right1.png", "assets/player/right2.png"],
};
const ENEMY_WALK = {
  down: ["assets/enemy/down1.png", "assets/enemy/down2.png"],
  up: ["assets/enemy/up1.png", "assets/enemy/up2.png"],
  left: ["assets/enemy/left1.png", "assets/enemy/left2.png"],
  right: ["assets/enemy/right1.png", "assets/enemy/right2.png"],
};

const SCENARIO = {
  title: "1面 はじまりの森",

  // ---- ここから 3つは マップ作成ツールの データ ----
  world: MAP.world,
  obstacles: MAP.obstacles, // 森の木・いわ・かべ（じどうで うまる）
  decorations: MAP.decorations, // かざり（ぶつからない）※抜け道の 木も これ

  // しゅじんこう（村から スタート）
  //   maxHp = ハートの かず ／ attack = 剣の つよさ
  player: {
    x: 700,
    y: 2200,
    sprite: "👧", // 絵が よみこめない ときの よび
    walk: PLAYER_WALK,
    size: 68,
    name: "リイコ",
    maxHp: 3,
    attack: 5,
  },

  // ★ミィ（ねこ）は 本当は 3面で 仲間になる よてい。
  //   いまは 主人公が まだ 剣を もっていない ので、
  //   たたかう 手だんとして のこしてあります（けいかく Ph1／Ph1.5 で 外します）。
  partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },

  // てき… behavior: patrol / chase / shooter / dummy(かかし)
  enemies: [
    // ★かかし（村。剣の れんしゅう台）… うごかない・こうげきしない・こわれない
    { id: "kakashi1", x: 870, y: 2250, sprite: "🎃", name: "かかし", maxHp: 999, attack: 0, behavior: "dummy" },
    { id: "kakashi2", x: 790, y: 2290, sprite: "🎃", name: "かかし", maxHp: 999, attack: 0, behavior: "dummy" },

    { id: "e1", x: 560, y: 1500, sprite: "😾", walk: ENEMY_WALK, size: 58, name: "いたずらネコ", maxHp: 12, attack: 2, behavior: "patrol", speed: 40, patrolRange: 90 },
    { id: "e2", x: 870, y: 1520, sprite: "😾", walk: ENEMY_WALK, size: 58, name: "いたずらネコ", maxHp: 12, attack: 2, behavior: "patrol", speed: 45, patrolRange: 80 },
    { id: "e3", x: 330, y: 1345, sprite: "🙀", walk: ENEMY_WALK, size: 58, name: "びっくりネコ", maxHp: 16, attack: 3, behavior: "chase", speed: 52, sight: 210 }, // 左の道（たからばこの ばんにん）
    // ★突進ネコ（抜け道の むこう）… ためる(❗)→まっすぐ 走る→かべで 目を まわす(💫)
    //   目を まわして いる ところを 斬ると 2ばい。1面 ゆいいつの 手ごわい てき。
    {
      id: "e4",
      x: 620,
      y: 900,
      sprite: "🙀",
      walk: ENEMY_WALK,
      size: 62,
      name: "もりの みはり",
      maxHp: 22,
      attack: 3,
      behavior: "charge",
      sight: 260,
      speed: 60,
      windupSec: 0.8, // ためる（この あいだに よける）
      dashSec: 0.85,
      dashSpeed: 300,
      dizzySec: 1.8, // 目を まわす（チャンス）
      restSec: 1.2,
    },
  ],

  // たからばこ（ぶつかると あく）
  chests: [
    { id: "c1", x: 255, y: 1265, key: "メダル", item: "🏅 メダル", message: "たからばこを あけた！『メダル🏅』を てにいれた！（左の 行きどまり）" },
    { id: "c2", x: 1040, y: 1500, key: "メダル", item: "🏅 メダル", message: "たからばこを あけた！『メダル🏅』を てにいれた！（森の広場の 右おく）" },
  ],

  // とびら：1面には なし（この面の「かぎ」は アイテムでは なく“気づくこと”）
  gates: [],

  // 出口（この面には ボスが いないので requireBoss: false）
  exit: {
    x: 710,
    y: 330,
    r: 50,
    requireBoss: false,
    label: "2面へ",
    lines: [
      "リイコは 高台に 立った。",
      "森の むこう、ずっと 遠くに 黒い しろが 見える…",
      "「あれが …やみの しろ？ ハナ、まってて！」",
      "（つづく！ 2面「ささやきの谷」へ）",
    ],
  },

  // とうじょうじんぶつ
  npcs: [
    {
      id: "n1",
      x: 500,
      y: 2120,
      sprite: "🧓",
      name: "むらの スミレばあちゃん",
      lines: [
        "リイコ！ ハナちゃんが 黒い マントの やつに さらわれて しまった…！",
        "北の 森の ほうへ 走っていったよ。",
        "そこの かかしで 剣の れんしゅうを して おいき。",
        "うごく：ボタン／WASD　・　🗡️ボタン／Jキー：けんを ふる",
      ],
    },
    {
      id: "n2",
      x: 700,
      y: 1860,
      sprite: "🧔",
      name: "きこりの タロ",
      // ★この面いちばん だいじな ヒント（P2：説明ではなく“目げき じょうほう”として わたす）
      lines: [
        "おう、リイコか。さっき 見たぞ ―― 黒い マントの やつだ。",
        "あいつ、道を 行かずに 森の 中へ 入って いったんだ。",
        "ふたつの 大きな いわの あいだを すーっと 通ってな。",
        "この森は ふしぎでな。木に 見えても 通れる ところが あるんだよ。",
      ],
    },
    {
      id: "n3",
      x: 1150,
      y: 1265,
      sprite: "🐰",
      name: "こうさぎの ミミ",
      // はずれの道。「だれも 通っていない」という“ない”情報が ヒントになる
      lines: [
        "こっちの 道？ きょうは だれも 来て ないよ。",
        "ちょうちょが しずかに とんでる でしょ。だれか 通ったら にげちゃうもん。",
        "…あ、まん中の 道は なんだか 草が たおれてた かも。",
      ],
    },
    {
      id: "n4",
      x: 620,
      y: 520,
      sprite: "🦉",
      name: "ふくろうの ホゥ",
      lines: [
        "ホウ。よく あの 森を 抜けてきたな。",
        "北を ごらん。あの 黒い しろが「やみの しろ」じゃ。",
        "…風に のって、だれかの 声が きこえないかい？",
      ],
    },
  ],
};
