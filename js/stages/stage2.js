/*
 * =========================================================
 *  2面「ささやきの谷」の おはなし
 * =========================================================
 *  ★まだ かりの すがた です。Ph6 で 作りこみます。
 *    ここで やる こと（けいかく docs/GAME_PLAN.md より）：
 *      ・クモの巣に とらわれた 妖精ピカを 助ける なぞ → 仲間1 加入
 *      ・灯りを 詩の じゅんに ともす なぞ（色と じゅんばん）
 *      ・弾ネコ／突進ネコ
 *      ・かげマントが すがたを 見せて にげる → 3面へ
 *  いまは「1面から ちゃんと つながるか」を たしかめる ためだけの 面です。
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

    enemies: [
      { id: "s2e1", x: 420, y: 470, sprite: "😾", walk: ENEMY_WALK, size: 58, name: "たにの ネコ", maxHp: 14, attack: 2, behavior: "patrol", speed: 44, patrolRange: 90 },
    ],
    chests: [],
    gates: [],
    exit: null, // つぎの 面は まだ ない

    npcs: [
      {
        id: "s2n1",
        x: 560,
        y: 330,
        sprite: "🕸️",
        name: "クモの す",
        lines: [
          "…たすけて…！ だれか いるの？",
          "（クモの巣に 小さな 光が とらわれて いる）",
          "（ここで 妖精ピカを 助ける なぞを 作ります ― Ph6）",
        ],
      },
    ],
  };
})();
