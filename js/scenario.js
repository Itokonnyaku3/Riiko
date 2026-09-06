/*
 * =========================================================
 *  ぜんたいの せってい（あいことば・キャラの絵・面の じゅんばん）
 * =========================================================
 *  おはなしの 中身（てき・NPC・セリフ）は 面ごとに 分けて あります：
 *      js/stages/stage1.js … 1面「はじまりの森」
 *      js/stages/stage2.js … 2面「ささやきの谷」
 *  地形（じめん・木）は js/maps/ に あります（マップ作成ツールの 出力）。
 *
 *  ぜんたいの けいかく → docs/GAME_PLAN.md
 * =========================================================
 */

// あいことば（かんたんな目隠し。ほんかくてきな鍵ではありません）
const GAME_CONFIG = { password: "neko" };

// ===== キャラの え（4ほうこう × 2コマ）=====
//   絵を さしかえたい ときは、この ばしょを かえるだけ。
//   walk を わたさない キャラは、いままでどおり 絵文字で うごきます。
//   絵の 作りかた → README.md の「キャラの 絵を さしかえるには」
window.WALKS = {
  player: {
    down: ["assets/player/down1.png", "assets/player/down2.png"],
    up: ["assets/player/up1.png", "assets/player/up2.png"],
    left: ["assets/player/left1.png", "assets/player/left2.png"],
    right: ["assets/player/right1.png", "assets/player/right2.png"],
  },
  enemy: {
    down: ["assets/enemy/down1.png", "assets/enemy/down2.png"],
    up: ["assets/enemy/up1.png", "assets/enemy/up2.png"],
    left: ["assets/enemy/left1.png", "assets/enemy/left2.png"],
    right: ["assets/enemy/right1.png", "assets/enemy/right2.png"],
  },
  boar: {
    down: ["assets/boar/down1.png", "assets/boar/down2.png"],
    up: ["assets/boar/up1.png", "assets/boar/up2.png"],
    left: ["assets/boar/left1.png", "assets/boar/left2.png"],
    right: ["assets/boar/right1.png", "assets/boar/right2.png"],
  },
  mushroom: {
    down: ["assets/mushroom/down1.png", "assets/mushroom/down2.png"],
    up: ["assets/mushroom/up1.png", "assets/mushroom/up2.png"],
    left: ["assets/mushroom/left1.png", "assets/mushroom/left2.png"],
    right: ["assets/mushroom/right1.png", "assets/mushroom/right2.png"],
  },
  spider: {
    down: ["assets/spider/down1.png", "assets/spider/down2.png"],
    up: ["assets/spider/up1.png", "assets/spider/up2.png"],
    left: ["assets/spider/left1.png", "assets/spider/left2.png"],
    right: ["assets/spider/right1.png", "assets/spider/right2.png"],
  },
  bat: {
    down: ["assets/bat/down1.png", "assets/bat/down2.png"],
    up: ["assets/bat/up1.png", "assets/bat/up2.png"],
    left: ["assets/bat/left1.png", "assets/bat/left2.png"],
    right: ["assets/bat/right1.png", "assets/bat/right2.png"],
  },
  mii: {
    down: ["assets/mii/down1.png", "assets/mii/down2.png"],
    up: ["assets/mii/up1.png", "assets/mii/up2.png"],
    left: ["assets/mii/left1.png", "assets/mii/left2.png"],
    right: ["assets/mii/right1.png", "assets/mii/right2.png"],
  },
  belle: {
    down: ["assets/belle/down1.png", "assets/belle/down2.png"],
    up: ["assets/belle/up1.png", "assets/belle/up2.png"],
    left: ["assets/belle/left1.png", "assets/belle/left2.png"],
    right: ["assets/belle/right1.png", "assets/belle/right2.png"],
  },
  gil: {
    down: ["assets/gil/down1.png", "assets/gil/down2.png"],
    up: ["assets/gil/up1.png", "assets/gil/up2.png"],
    left: ["assets/gil/left1.png", "assets/gil/left2.png"],
    right: ["assets/gil/right1.png", "assets/gil/right2.png"],
  },
  seera: {
    down: ["assets/seera/down1.png", "assets/seera/down2.png"],
    up: ["assets/seera/up1.png", "assets/seera/up2.png"],
    left: ["assets/seera/left1.png", "assets/seera/left2.png"],
    right: ["assets/seera/right1.png", "assets/seera/right2.png"],
  },
  hana: {
    down: ["assets/hana/down1.png", "assets/hana/down2.png"],
    up: ["assets/hana/up1.png", "assets/hana/up2.png"],
    left: ["assets/hana/left1.png", "assets/hana/left2.png"],
    right: ["assets/hana/right1.png", "assets/hana/right2.png"],
  },
  kagemanto: {
    down: ["assets/kagemanto/down1.png", "assets/kagemanto/down2.png"],
    up: ["assets/kagemanto/up1.png", "assets/kagemanto/up2.png"],
    left: ["assets/kagemanto/left1.png", "assets/kagemanto/left2.png"],
    right: ["assets/kagemanto/right1.png", "assets/kagemanto/right2.png"],
  },
  kakashi: {
    down: ["assets/kakashi/down1.png", "assets/kakashi/down2.png"],
    up: ["assets/kakashi/up1.png", "assets/kakashi/up2.png"],
    left: ["assets/kakashi/left1.png", "assets/kakashi/left2.png"],
    right: ["assets/kakashi/right1.png", "assets/kakashi/right2.png"],
  },
  sumire: {
    down: ["assets/sumire/down1.png", "assets/sumire/down2.png"],
    up: ["assets/sumire/up1.png", "assets/sumire/up2.png"],
    left: ["assets/sumire/left1.png", "assets/sumire/left2.png"],
    right: ["assets/sumire/right1.png", "assets/sumire/right2.png"],
  },
  hou: {
    down: ["assets/hou/down1.png", "assets/hou/down2.png"],
    up: ["assets/hou/up1.png", "assets/hou/up2.png"],
    left: ["assets/hou/left1.png", "assets/hou/left2.png"],
    right: ["assets/hou/right1.png", "assets/hou/right2.png"],
  },
  maou: {
    down: ["assets/maou/down1.png", "assets/maou/down2.png"],
    up: ["assets/maou/up1.png", "assets/maou/up2.png"],
    left: ["assets/maou/left1.png", "assets/maou/left2.png"],
    right: ["assets/maou/right1.png", "assets/maou/right2.png"],
  },
  penta: {
    down: ["assets/penta/down1.png", "assets/penta/down2.png"],
    up: ["assets/penta/up1.png", "assets/penta/up2.png"],
    left: ["assets/penta/left1.png", "assets/penta/left2.png"],
    right: ["assets/penta/right1.png", "assets/penta/right2.png"],
  },
};

// 面の 入れもの（js/stages/◯◯.js が ここに 自分を 入れます）
window.STAGES = {};

// 面の じゅんばん（HUDの「やみのしろ まで あと◯めん」に つかう）
//   3面・4面が できたら ここに 足す
window.STAGE_ORDER = ["stage1", "stage2", "stage3", "stage4"];

// はじめる 面
window.FIRST_STAGE = "stage1";
