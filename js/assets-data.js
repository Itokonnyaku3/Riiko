/*
 * =========================================================
 *  マップの パーツ一らん（じどうで つくられる ファイル）
 * =========================================================
 *  手で なおさないでね。かえたい ときは
 *      python tools/build-assets.py
 *  を もう一ど 走らせる。
 *
 *    id    絵の 名まえ（マップデータに のこる）
 *    r     ぶつかる まるの 大きさ（0 = すりぬける かざり）
 *    size  ゲームの中での たての 大きさ
 *    em    絵が よみこめない ときの 代わりの 絵文字
 * =========================================================
 */
(function () {
  "use strict";
  window.PartAssets = {
    dir: "assets/parts/",
    groups: {"tree": "き・もり", "plant": "くさ・しげみ", "rock": "いし・いわ", "thing": "どうぐ", "build": "たてもの・さく", "land": "けしき"},
    list: [
      { id: "tree-big", label: "大きい き", group: "tree", w: 190, h: 234, r: 30, size: 112, em: "🌳" },
      { id: "tree", label: "き", group: "tree", w: 150, h: 197, r: 26, size: 94, em: "🌳" },
      { id: "tree-canopy", label: "きの はっぱ", group: "tree", w: 150, h: 135, r: 0, size: 70, em: "🌿" },
      { id: "tree-canopy2", label: "きの はっぱ2", group: "tree", w: 146, h: 142, r: 0, size: 70, em: "🌿" },
      { id: "tree2", label: "き2", group: "tree", w: 146, h: 182, r: 26, size: 88, em: "🌳" },
      { id: "tree-small", label: "小さい き", group: "tree", w: 119, h: 174, r: 22, size: 76, em: "🌳" },
      { id: "tree3", label: "き3", group: "tree", w: 127, h: 138, r: 24, size: 72, em: "🌳" },
      { id: "tree4", label: "き4", group: "tree", w: 115, h: 162, r: 24, size: 80, em: "🌳" },
      { id: "tree5", label: "き5", group: "tree", w: 128, h: 156, r: 24, size: 82, em: "🌳" },
      { id: "tree6", label: "き6", group: "tree", w: 111, h: 130, r: 22, size: 70, em: "🌳" },
      { id: "fir-big", label: "大きい もみのき", group: "tree", w: 118, h: 238, r: 26, size: 116, em: "🌲" },
      { id: "fir-tall", label: "たかい もみのき", group: "tree", w: 121, h: 215, r: 24, size: 106, em: "🌲" },
      { id: "fir", label: "もみのき", group: "tree", w: 103, h: 195, r: 24, size: 96, em: "🌲" },
      { id: "fir2", label: "もみのき2", group: "tree", w: 115, h: 183, r: 22, size: 92, em: "🌲" },
      { id: "fir-small", label: "小さい もみのき", group: "tree", w: 88, h: 142, r: 20, size: 74, em: "🌲" },
      { id: "stump", label: "きりかぶ", group: "plant", w: 118, h: 107, r: 18, size: 46, em: "🪵" },
      { id: "stump2", label: "きりかぶ2", group: "plant", w: 114, h: 101, r: 18, size: 44, em: "🪵" },
      { id: "stump3", label: "われた きりかぶ", group: "plant", w: 117, h: 90, r: 18, size: 40, em: "🪵" },
      { id: "bush-white", label: "しろい花の しげみ", group: "plant", w: 116, h: 99, r: 18, size: 44, em: "🌼" },
      { id: "bush-red", label: "あかい花の しげみ", group: "plant", w: 115, h: 99, r: 18, size: 44, em: "🌺" },
      { id: "bush-blue", label: "あおい花の しげみ", group: "plant", w: 115, h: 98, r: 18, size: 44, em: "🪻" },
      { id: "bush-yellow", label: "きいろ花の しげみ", group: "plant", w: 116, h: 99, r: 18, size: 44, em: "🌻" },
      { id: "bush-berry", label: "みのなる しげみ", group: "plant", w: 121, h: 107, r: 18, size: 46, em: "🍒" },
      { id: "log-moss", label: "こけの まるた", group: "plant", w: 118, h: 70, r: 20, size: 52, em: "🪵" },
      { id: "log", label: "まるた", group: "plant", w: 118, h: 62, r: 20, size: 48, em: "🪵" },
      { id: "grass-tuft", label: "くさ", group: "plant", w: 67, h: 61, r: 0, size: 32, em: "🌿" },
      { id: "grass-tuft2", label: "くさ2", group: "plant", w: 57, h: 57, r: 0, size: 30, em: "🌿" },
      { id: "grass-small", label: "小さい くさ", group: "plant", w: 55, h: 50, r: 0, size: 26, em: "☘️" },
      { id: "leaf", label: "はっぱ", group: "plant", w: 47, h: 44, r: 0, size: 22, em: "🍃" },
      { id: "rocks-moss", label: "こけの いわ", group: "rock", w: 112, h: 69, r: 20, size: 46, em: "🪨" },
      { id: "rocks", label: "いわ", group: "rock", w: 115, h: 65, r: 20, size: 44, em: "🪨" },
      { id: "stone", label: "いし", group: "rock", w: 66, h: 58, r: 14, size: 32, em: "🪨" },
      { id: "rock-a", label: "いし A", group: "rock", w: 64, h: 55, r: 16, size: 36, em: "🪨" },
      { id: "rock-b", label: "いし B", group: "rock", w: 69, h: 63, r: 16, size: 38, em: "🪨" },
      { id: "rock-c", label: "いし C", group: "rock", w: 76, h: 55, r: 16, size: 36, em: "🪨" },
      { id: "rock-d", label: "いわ D", group: "rock", w: 76, h: 78, r: 20, size: 48, em: "🪨" },
      { id: "rock-e", label: "いわ E", group: "rock", w: 74, h: 74, r: 20, size: 48, em: "🪨" },
      { id: "rock-f", label: "いし F", group: "rock", w: 64, h: 47, r: 18, size: 36, em: "🪨" },
      { id: "pebbles", label: "小石", group: "rock", w: 50, h: 46, r: 0, size: 26, em: "🪨" },
      { id: "pebble", label: "小さい いし", group: "rock", w: 36, h: 33, r: 0, size: 22, em: "🪨" },
      { id: "rock-big", label: "大きい いわ", group: "rock", w: 182, h: 166, r: 40, size: 100, em: "🪨" },
      { id: "rock-big2", label: "大きい いわ2", group: "rock", w: 210, h: 190, r: 44, size: 110, em: "🪨" },
      { id: "rock-big3", label: "大きい いわ3", group: "rock", w: 228, h: 191, r: 46, size: 114, em: "🪨" },
      { id: "rock-flat", label: "ひらたい いわ", group: "rock", w: 189, h: 142, r: 42, size: 92, em: "🪨" },
      { id: "chest", label: "たからばこ", group: "thing", w: 119, h: 110, r: 20, size: 54, em: "🎁" },
      { id: "chest-open", label: "あいた たからばこ", group: "thing", w: 124, h: 128, r: 20, size: 58, em: "🎁" },
      { id: "barrel", label: "たる", group: "thing", w: 88, h: 118, r: 18, size: 56, em: "🛢️" },
      { id: "barrel-side", label: "よこの たる", group: "thing", w: 117, h: 101, r: 20, size: 48, em: "🛢️" },
      { id: "pot", label: "つぼ", group: "thing", w: 86, h: 92, r: 16, size: 46, em: "🏺" },
      { id: "pot-broken", label: "われた つぼ", group: "thing", w: 84, h: 83, r: 16, size: 40, em: "🏺" },
      { id: "crate", label: "木ばこ", group: "thing", w: 75, h: 102, r: 18, size: 50, em: "📦" },
      { id: "crates", label: "木ばこ たくさん", group: "thing", w: 130, h: 146, r: 26, size: 74, em: "📦" },
      { id: "house", label: "いえ", group: "build", w: 228, h: 233, r: 55, size: 150, em: "🏠" },
      { id: "house2", label: "いえ2", group: "build", w: 227, h: 234, r: 55, size: 150, em: "🏠" },
      { id: "house-big", label: "大きい いえ", group: "build", w: 220, h: 215, r: 55, size: 146, em: "🏠" },
      { id: "house-stone", label: "いしの いえ", group: "build", w: 209, h: 200, r: 52, size: 140, em: "🏠" },
      { id: "house-stone2", label: "いしの いえ2", group: "build", w: 209, h: 208, r: 52, size: 142, em: "🏠" },
      { id: "house-straw", label: "わらの いえ", group: "build", w: 189, h: 228, r: 50, size: 150, em: "🛖" },
      { id: "house-straw2", label: "わらの いえ2", group: "build", w: 192, h: 226, r: 50, size: 148, em: "🛖" },
      { id: "barn", label: "くら", group: "build", w: 207, h: 188, r: 52, size: 132, em: "🏚️" },
      { id: "well", label: "いど", group: "build", w: 113, h: 127, r: 26, size: 74, em: "⛲" },
      { id: "sign", label: "たてふだ", group: "build", w: 84, h: 128, r: 12, size: 60, em: "🪧" },
      { id: "sign-arrow", label: "やじるしの ふだ", group: "build", w: 87, h: 129, r: 12, size: 60, em: "🪧" },
      { id: "fence-long", label: "ながい さく", group: "build", w: 193, h: 64, r: 22, size: 40, em: "🚧" },
      { id: "fence", label: "さく", group: "build", w: 97, h: 64, r: 16, size: 40, em: "🚧" },
      { id: "fence-corner", label: "さくの かど", group: "build", w: 90, h: 80, r: 16, size: 46, em: "🚧" },
      { id: "fence-tall", label: "たかい さく", group: "build", w: 194, h: 95, r: 22, size: 58, em: "🚧" },
      { id: "gate", label: "もん", group: "build", w: 212, h: 95, r: 24, size: 58, em: "🚪" },
      { id: "post", label: "くい", group: "build", w: 31, h: 90, r: 10, size: 52, em: "🪵" },
      { id: "bridge-left", label: "はしの ひだり", group: "build", w: 108, h: 119, r: 28, size: 66, em: "🌉" },
      { id: "bridge", label: "はし", group: "build", w: 207, h: 122, r: 30, size: 68, em: "🌉" },
      { id: "bridge-right", label: "はしの みぎ", group: "build", w: 111, h: 119, r: 28, size: 66, em: "🌉" },
      { id: "deck", label: "てすりの だい", group: "build", w: 162, h: 154, r: 34, size: 82, em: "🌉" },
      { id: "castle-far", label: "とおくの しろ", group: "land", w: 328, h: 311, r: 70, size: 220, em: "🏰" },
      { id: "scenery-lake", label: "とおくの みずうみ", group: "land", w: 611, h: 311, r: 0, size: 200, em: "🏞️" },
      { id: "mountain", label: "やま", group: "land", w: 284, h: 187, r: 60, size: 130, em: "⛰️" },
      { id: "cliff-wall", label: "がけの かべ", group: "land", w: 111, h: 254, r: 40, size: 150, em: "🧱" },
      { id: "cliff", label: "がけ", group: "land", w: 146, h: 250, r: 45, size: 146, em: "🧱" },
      { id: "cliff2", label: "がけ2", group: "land", w: 143, h: 253, r: 45, size: 148, em: "🧱" },
    ],
  };
})();
