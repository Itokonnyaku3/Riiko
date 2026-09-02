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

    // ★仲間1 妖精ベル（pikaJoined の フラグが 立つと ついてくる）
    fairy: {
      if: "pikaJoined",
      sprite: "🧚",
      name: "ベル",
      size: 34,
      potions: 2, // この面で 薬を くれる 回数
      // かってに しゃべる ことば（おなじ ことは つづけて 言わない）
      lines: {
        idle: [
          "ふふっ、アタシについてくれば 間違いないわ！",
          "リイコ、ぼーっとしてると 置いてっちゃうわよ？",
          "谷の風、アタシの羽には ちょうどいいわね",
          "前の仲間？ あんなケチな連中、こっちから願い下げよ！",
          "さっさと あいつらの城まで 乗り込むわよ！",
        ],
        enemy: [
          "ちょっと、敵よ！ ちゃんと戦いなさいよね！",
          "あの子、生意気そうな顔してるわ！ やっつけちゃいなさい！",
          "うしろよ、うしろ！ 油断しすぎ！",
        ],
        chest: ["あら、あそこ光ってない？ 宝箱よ、アタシに貢ぎなさい！", "あけて、あけて！ いいもの入ってるかしら？"],
        hurt: ["きゃあっ！ ちょっと、しっかりしなさいよ！", "ハートが減ってるじゃない！ 薬草持ってきてあげるから待ってなさい！"],
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
