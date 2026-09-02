/*
 * =========================================================
 *  1面「はじまりの森」の おはなし
 * =========================================================
 *  ◆地形・てき・NPC・トリガー・ヒント・カットシーンは すべて
 *    マップ作成ツールで 作ります◆
 *      → tools/map-editor.html を ブラウザで ひらく
 *      → 「📚 よむ」で stage1 を よみこむ ／ 「💾 ファイルに だす」で 書きだす
 *      → できた ファイルを js/maps/stage1.js に おく
 *  この ファイルは、js/maps/stage1.js の 中みを ゲームの かたちに
 *    組み立てるだけの うすい ファイルです（partner など この面だけの
 *    しくみだけ、ここに 手で 書きます）。
 *
 *  あいことばや キャラの絵の ばしょは js/scenario.js に あります。
 *  ぜんたいの けいかく → docs/GAME_PLAN.md
 * =========================================================
 *  1面の ながれ
 *    村（ハナが さらわれる）
 *      → 森の入口：きこりの タロが 目げき じょうほうを くれる  ★ヒント
 *      → 森の広場（てきと たたかう れんしゅう）
 *      → 三叉路：左・右は はずれ。足あとの ある まん中が 正かい  ★なぞ
 *      → ふたつの 大きな いわ の あいだ＝見た目は 森だが 通り抜けられる  ★なぞの かなめ
 *      → 森の おく（突進ネコ）
 *      → 見晴らしの 高台：遠くに「やみの しろ」が 見える ＋ ハナの こえ
 * =========================================================
 */
(function () {
  const MAP = MapData.build(window.MAPS["stage1"]);
  const PLAYER_WALK = window.WALKS.player;
  const ENEMY_WALK = window.WALKS.enemy;

  window.STAGES.stage1 = {
    title: "1面 はじまりの森",
    next: "stage2", // 出口から すすむ 先

    // ★プロローグ（1回だけ。2〜3分では なく 40びょうほど。すぐ 遊べる ように）
    intro: MAP.intro,

    // ---- ここから マップ作成ツールの データ（地形）----
    world: MAP.world,
    obstacles: MAP.obstacles, // 森の木・いわ・かべ（じどうで うまる）
    decorations: MAP.decorations, // かざり（ぶつからない）※抜け道の 木も これ

    // しゅじんこう（村から スタート）
    //   maxHp = ハートの かず ／ attack = 剣の つよさ
    player: { ...MAP.player, walk: PLAYER_WALK },

    // ★仲間（ねこミィ）は 3面で 加わる よてい。
    //   1面は リイコ ひとり なので partner は なし（null）。
    //   3面を 作る ときに、下の 行を もどせば また 出てきます：
    //     partner: { sprite: "🐱", name: "ミィ", maxHp: 30, attack: 4 },
    partner: null,

    // てき… behavior: patrol / chase / shooter / dummy(かかし)
    //   walk（絵の むき）が ほしい てきだけ、ENEMY_WALK を つける。
    enemies: MAP.enemies.map((e) => {
      const { walk, ...rest } = e;
      return walk ? { ...rest, walk: ENEMY_WALK } : rest;
    }),

    // ★ヒント（こまって いる 時間で こくなる。うえから じゅんに 見る）
    //   1面は ピカが いないので、リイコの「思い出し」として 出る。
    //   3つめは 行き先が 光る（point）。
    hints: MAP.hints,

    // ★チェックポイント（やられても ここから やりなおせる）
    checkpoints: MAP.checkpoints,

    // ★通ると 何かが おきる ばしょ
    triggers: MAP.triggers,

    // たからばこ（ぶつかると あく）
    chests: MAP.chests,

    // とびら：1面には なし（この面の「かぎ」は アイテムでは なく“気づくこと”）
    gates: MAP.gates,

    // 出口（この面には ボスが いないので requireBoss: false）
    exit: MAP.exit,

    // とうじょうじんぶつ
    npcs: MAP.npcs,
  };
})();
