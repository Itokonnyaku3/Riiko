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

    player: {
      x: 550,
      y: 800,
      sprite: "👧",
      walk: PLAYER_WALK,
      size: 68,
      name: "リイコ",
      maxHp: 3,
      attack: 5,
    },
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

    hints: [
      {
        ifNot: "pikaJoined",
        lines: [
          "（谷の おくから、小さな 声が きこえる…）",
          "（何かが たすけを もとめて いる みたい）",
          "（谷の おくの クモの巣を 剣で 切って みよう）",
        ],
        point: { x: 560, y: 330 },
      },
      {
        lines: ["（もっと 北へ 行って みよう）", "（谷の おくに 道が ある）", "（いちばん 北を めざそう）"],
        point: { x: 550, y: 170 },
      },
    ],

    checkpoints: [{ id: "s2cp1", x: 550, y: 500, r: 70 }],

    enemies: [
      {
        id: "s2e1",
        x: 420,
        y: 470,
        sprite: "😾",
        walk: ENEMY_WALK,
        size: 58,
        name: "たにの ネコ",
        remember: true,
        maxHp: 14,
        attack: 2,
        behavior: "patrol",
        speed: 44,
        patrolRange: 90,
      },
    ],
    chests: [],
    gates: [],

    triggers: [
      // ★クモの巣：近づくと 声が きこえる
      {
        id: "s2-web",
        x: 560,
        y: 360,
        r: 70,
        ifNot: "pikaJoined",
        mutter: "（だれかの 声…？ クモの巣が ゆれてる）",
      },
    ],

    exit: {
      x: 550,
      y: 150,
      r: 50,
      requireBoss: false,
      label: "つづく",
      lines: ["ここから さきは、これから 作ります。", "あそんで くれて ありがとう！🎉"],
    },

    npcs: [
      {
        id: "s2n1",
        x: 560,
        y: 330,
        sprite: "🕸️",
        name: "クモの す",
        r: 46,
        ifNot: "pikaJoined",
        // 話しかけると 助ける（Ph6 では「剣で 切る」なぞに する）
        set: "pikaJoined",
        lines: [
          "…たすけて…！ だれか いるの？",
          "（クモの巣に、小さな 光が とらわれて いる）",
          "リイコは 剣で そっと 巣を 切った。",
        ],
      },
      {
        id: "s2n2",
        x: 600,
        y: 330,
        sprite: "🧚",
        name: "ピカ",
        if: "pikaJoined",
        r: 40,
        variants: [
          {
            minTalks: 2,
            lines: ["わたし、ヒントを 出すの とくいなんだ！", "こまったら 💡 を おしてね"],
          },
          {
            lines: [
              "たすけて くれて ありがとう！ わたし、ピカ！",
              "リイコ、だっけ。おともだちを さがしてるんだね？",
              "わたしも いっしょに 行く！ 道は くわしいよ。",
              "こまったら 💡ボタンを おして。ヒントを 出すから！",
            ],
          },
        ],
      },
    ],
  };
})();
