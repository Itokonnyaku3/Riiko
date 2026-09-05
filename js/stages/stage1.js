/*
 * =========================================================
 *  1面「はじまりの森」の おはなし（スクリプト定義）
 * =========================================================
 */
(function () {
  const MAP = MapData.build(window.MAPS["stage1"]);
  const PLAYER_WALK = window.WALKS.player;
  const ENEMY_WALK = window.WALKS.enemy;

  // 敵の歩行アニメーションキーを付与
  const enemiesWithWalk = (MAP.enemies || []).map((e) => {
    if (e.walk) {
      const walkKey = e.walkKey || (typeof e.walk === "string" ? e.walk : "enemy");
      const walkData = (window.WALKS && window.WALKS[walkKey]) || ENEMY_WALK;
      return { ...e, walk: walkData, walkKey: walkKey };
    }
    return { ...e };
  });

  window.STAGES.stage1 = {
    title: "1面 はじまりの森",
    next: "stage2",

    world: MAP.world,
    obstacles: MAP.obstacles,
    decorations: MAP.decorations,

    player: {
      x: MAP.player ? MAP.player.x : 1200,
      y: MAP.player ? MAP.player.y : 4120,
      maxHp: 3,
      attack: 5,
      sprite: "👧",
      walk: PLAYER_WALK,
    },

    partner: null,
    intro: MAP.intro,
    npcs: MAP.npcs,
    enemies: enemiesWithWalk,
    gates: MAP.gates || [],
    triggers: MAP.triggers,
    chests: MAP.chests,
    checkpoints: MAP.checkpoints,
    hints: MAP.hints,
    exit: MAP.exit,
  };
})();
