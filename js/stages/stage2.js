/*
 * =========================================================
 *  2面「ささやきの谷」の おはなし
 * =========================================================
 *  ★まだ とちゅう です。Ph6 で 作りこみます。
 *    できて いる こと：
 *      ・クモの巣に とらわれた 妖精ピカを 助ける → 仲間1 加入
 *      ・ピカが ついてくる／かってに しゃべる／ヒントを くれる／薬を くれる
 *    これから（Ph6）：
 *      ・灯りを 詩の じゅんに ともす なぞ（色と じゅんばん）
 *      ・弾ネコ／突進ネコ を ふやす
 *      ・かげマントが すがたを 見せて にげる → 3面へ
 *
 *  地形・てき・NPC・トリガー・ヒントは js/maps/stage2.js（マップ作成ツール）
 *  で 作ります。この ファイルは それを 組み立てて、fairy（妖精ピカの
 *  しくみ）のような この面だけの ぶぶんを 足すだけの うすい ファイルです。
 * =========================================================
 */
(function () {
  const MAP = MapData.build(window.MAPS["stage2"]);
  const PLAYER_WALK = window.WALKS.player;
  const ENEMY_WALK = window.WALKS.enemy;

  window.STAGES.stage2 = {
    title: "2面 ささやきの谷",
    next: null, // まだ さきは ない

    world: MAP.world,
    obstacles: MAP.obstacles,
    decorations: MAP.decorations,

    player: { ...MAP.player, walk: PLAYER_WALK },
    partner: null, // ミィが 加わるのは 3面

    // ★仲間1 妖精ピカ（pikaJoined の フラグが 立つと ついてくる）
    fairy: {
      if: "pikaJoined",
      sprite: "🧚",
      name: "ピカ",
      size: 34,
      potions: 2, // この面で 薬を くれる 回数
      // かってに しゃべる ことば（おなじ ことは つづけて 言わない）
      lines: {
        idle: [
          "わあ、ここ ひろいねー！",
          "リイコ、つかれて ない？",
          "谷の 音が こだま してる…",
          "わたし、けっこう 早く とべるんだよ！",
          "さっきの 森、こわかったねえ",
        ],
        enemy: [
          "うしろ、うしろ！",
          "きた！ 気を つけて！",
          "その子、おこってる みたい…",
        ],
        chest: ["なんか 光ってる 気が する…", "たからばこ！ あけよ あけよ！"],
        hurt: ["だいじょうぶ？ むりしないで！", "ハートが へってる よ…"],
      },
    },

    hints: MAP.hints,
    checkpoints: MAP.checkpoints,

    enemies: MAP.enemies.map((e) => {
      const { walk, ...rest } = e;
      return walk ? { ...rest, walk: ENEMY_WALK } : rest;
    }),
    chests: MAP.chests,
    gates: MAP.gates,
    triggers: MAP.triggers,
    exit: MAP.exit,
    npcs: MAP.npcs,
  };
})();
