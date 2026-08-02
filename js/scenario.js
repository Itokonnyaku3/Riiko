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
};

// 面の 入れもの（js/stages/◯◯.js が ここに 自分を 入れます）
window.STAGES = {};

// はじめる 面
window.FIRST_STAGE = "stage1";
