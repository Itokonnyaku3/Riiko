/*
 * =========================================================
 *  3面「静寂の湖」の おはなし（シナリオスクリプト）
 * =========================================================
 *  ・新武器「風のブーメラン」による遠隔攻撃・スタン・スイッチ作動
 *  ・湖の入り口での選択肢分岐（木道ルート vs 浅瀬・小島ルート）
 *  ・湖上砦での包囲戦と、相棒猫ミィの颯爽とした乱入参戦カットシーン
 *  ・タップ戦闘（画面タップによるミィへの指示）の正式解禁
 *  ・盾持ち敵（シールドタートル）に対するミィとの連携・ブーメラン攻略
 *  ・神殿最奥での友達ハナとの再会と、かげマントの闇の結界による連れ去りドラマ演出
 *  ・4面「やみのしろ」への出口開放
 * =========================================================
 */
(function () {
  const MAP = MapData.build(window.MAPS["stage3"]);
  const PLAYER_WALK = window.WALKS.player;
  const ENEMY_WALK = window.WALKS.enemy;

  // 敵の歩行アニメーションキーを付与
  const enemiesWithWalk = (MAP.enemies || []).map((e) => {
    if (e.walkKey || e.walk) {
      const walkKey = e.walkKey || (typeof e.walk === "string" ? e.walk : "enemy");
      const walkData = (window.WALKS && window.WALKS[walkKey]) || ENEMY_WALK;
      return { ...e, walk: walkData, walkKey: walkKey };
    }
    return { ...e };
  });

  window.STAGES.stage3 = {
    title: "3面 静寂の湖",
    next: "stage4",

    world: MAP.world,
    obstacles: MAP.obstacles,
    decorations: MAP.decorations,

    player: {
      ...MAP.player,
      walk: PLAYER_WALK,
    },

    weapons: ["sword", "boomerang"],

    // 仲間1：妖精ベル（2面から継続して同行）
    fairy: {
      sprite: "🧚",
      name: "ベル",
      size: 46,
      potions: 2,
      lines: {
        idle: [
          "湖の水、とっても澄んでて綺麗ね…でも油断しちゃダメよ！",
          "遠くのスイッチには風のブーメランを投げてみるのよ！",
          "ミィってば、たまにサボって毛づくろいしてるじゃない！",
          "神殿の奥からハナちゃんの気配がするわ…急ぎましょ！",
          "リイコ、ブーメランの調子はどう？ ちゃんと手元に戻るわね！",
          "湖の風、アタシの羽にはちょっと湿りすぎかしら？",
        ],
        enemy: [
          "ちょっと、あの亀！ 正面の盾が固いわよ！",
          "ミィに正面を引きつけさせて、背後を斬るのよ！",
          "ブーメランをカーブさせて背中に当てなさい！",
          "コウモリが飛んできてるわ！ ブーメランで落としちゃいなさい！",
        ],
        chest: [
          "あら、あそこ光ってない？ 宝箱よ、アタシに開けさせなさい！",
          "湖の底にもお宝が沈んでたりしないかしら？",
        ],
        hurt: [
          "きゃあっ！ ちょっと、しっかりしなさいよ！",
          "ハートが減ってるじゃない！ 薬草使ってあげるから踏ん張りなさい！",
        ],
      },
    },

    // 仲間2：猫ミィ（包囲戦イベントで加入）
    partner: null,

    hints: [
      {
        text: "道が二手に分かれているわ。西の木道か、東の浅瀬か…どっちかを進んでみましょ！",
      },
      {
        text: "遠くて届かない水晶スイッチには、風のブーメランを投げてみて！",
      },
      {
        text: "中央の砦を抜けて、湖の北にある水上神殿を目指すのよ！",
      },
    ],

    checkpoints: MAP.checkpoints,
    boulders: MAP.boulders || [],
    crystalSwitches: MAP.crystalSwitches || [],
    enemies: enemiesWithWalk,
    chests: MAP.chests || [],
    gates: MAP.gates || [],
    npcs: [
      ...MAP.npcs,
      // 牢屋の中のハナ（イベント発生前は牢屋にいる）
      {
        id: "s3_hana_cell",
        x: 1300,
        y: 530,
        sprite: "👧",
        name: "ハナ",
        walkKey: "hana",
        if: "!hanaSeen",
        lines: ["リイコ…！ 助けて…！"],
      },
    ],
    exit: MAP.exit,

    // トリガーイベント
    triggers: [
      // 1) 冒頭：ベルとの会話とルート選択肢
      {
        id: "trig_s3_intro",
        x: 1300,
        y: 3380,
        r: 60,
        action: function (G, Sfx, Dialogue) {
          if (G.flags.s3IntroDone) return;
          G.flags.s3IntroDone = true;

          const lines = [
            "ここが「静寂の湖」ね…！",
            "見て、リイコ！ 湖の中央に大きな神殿が見えるわ！",
            "ハナちゃんはきっとあそこに捕まっているはずよ！",
            "でも道が二手に分かれてるわね…どうやって渡る？",
          ];

          const choices = [
            {
              text: "西の崩れかけの木道を行く（魔物が多いが近道！）",
              onSelect: () => {
                G.flags.routeChoice = "west";
                Dialogue.open("ベル", [
                  "木道ね！ 敵が待ち構えてそうだけど、一気に駆け抜けましょ！",
                  "新しく手に入れた『風のブーメラン🪃』で遠くからスタンさせると有利よ！",
                ]);
              },
            },
            {
              text: "東の浅瀬と小島を行く（安全だが仕掛けを解く知恵が必要）",
              onSelect: () => {
                G.flags.routeChoice = "east";
                Dialogue.open("ベル", [
                  "浅瀬を回るのね！ 水門が閉まっているみたいだから、",
                  "孤島にある水晶スイッチを『風のブーメラン🪃』で狙って起動しましょ！",
                ]);
              },
            },
          ];

          Dialogue.open("ベル", lines, null, choices);
        },
      },

      // 2) 湖上砦での包囲ピンチと、相棒猫ミィの乱入参戦！
      {
        id: "trig_fort_trap",
        x: 1300,
        y: 2180,
        r: 90,
        action: function (G, Sfx, Dialogue) {
          if (G.flags.fortTrapTriggered) return;
          G.flags.fortTrapTriggered = true;

          // 砦の南の鉄柵を閉める
          for (const g of G.gates) {
            if (g.id === "gate_trap") {
              g.open = false;
            }
          }

          // 画面揺れと緊迫音
          G.shake = 12;
          Sfx.play("barrier");

          Dialogue.open("ベル", [
            "きゃあっ！？ 南の鉄柵がガシャンと閉まったわ！",
            "ちょっと、何これ！？ 周りから魔物が湧いてきたわよ！！",
          ], () => {
            // 包囲ピンチ演出
            Dialogue.open("リイコ", [
              "くっ…！ 前も後ろも魔物だらけ…！？",
              "挟み撃ちされちゃう…！",
            ], () => {
              // ミィの乱入カットシーン！
              G.shake = 15;
              Sfx.play("dash");
              Sfx.play("nice");

              Dialogue.open("？？？", [
                "「ニャアアアアアン！！💥」",
              ], () => {
                // ミィが参戦！
                if (window.RiikoGame && window.RiikoGame._test && window.RiikoGame._test.addPartner) {
                  window.RiikoGame._test.addPartner({
                    name: "ミィ",
                    sprite: "🐱",
                    attack: 6,
                    maxHp: 14,
                    x: G.player.x - 30,
                    y: G.player.y + 20,
                  });
                } else if (typeof addPartner === "function") {
                  addPartner({
                    name: "ミィ",
                    sprite: "🐱",
                    attack: 6,
                    maxHp: 14,
                    x: G.player.x - 30,
                    y: G.player.y + 20,
                  });
                }

                Dialogue.open("リイコ", [
                  "ミィ！？ あなた、無事だったのね！？",
                ], () => {
                  Dialogue.open("ミィ", [
                    "ニャッ！（まかせてニャ！ リイコ、いっしょに戦うニャ！）",
                  ], () => {
                    Dialogue.open("ベル", [
                      "な、何この猫！？ 屋根の上から飛び降りて敵を一撃で倒したわよ！？",
                      "すっごい頼もしいじゃない！ これなら勝てるわ！",
                      "【あそびかた】",
                      "画面の敵をタップすると、ミィが突撃して攻撃してくれるわ！",
                      "盾を持った敵は、ミィに正面を引きつけさせて背後から斬るか、",
                      "風のブーメランをカーブさせて背中に当てなさい！",
                    ], () => {
                      // 砦の北の扉を開放
                      for (const g of G.gates) {
                        if (g.id === "gate_north") {
                          g.open = true;
                          G.obstacles = G.obstacles.filter((o) => o.gateId !== g.id);
                        }
                      }
                    });
                  });
                });
              });
            });
          });
        },
      },

      // 3) 神殿最奥：ハナ遭遇・かげマント強襲連れ去りドラマ演出
      {
        id: "trig_temple_hana",
        x: 1300,
        y: 680,
        r: 80,
        action: function (G, Sfx, Dialogue) {
          if (G.flags.hanaSeen) return;
          G.flags.hanaSeen = true;

          Dialogue.open("ハナ", [
            "あ……リイコ！ ベルちゃん！ ミィもいるの！？",
            "助けに来てくれたんだね…！",
          ], () => {
            Dialogue.open("リイコ", [
              "ハナ！ よかった、無事だったんだね！",
              "今すぐその牢屋を開けるから待ってて！",
            ], () => {
              // 突如現れるかげマント！
              G.shake = 16;
              Sfx.play("barrier");

              // かげマントをアクターとして召喚
              G.actors.push({
                x: 1300,
                y: 580,
                sprite: "🥷",
                name: "かげマント",
                walkKey: "kagemanto",
                size: 60,
              });

              Dialogue.open("かげマント", [
                "フハハハ…！ 甘いぞ、小娘ども！",
                "ここまで辿り着いたことは褒めてやるが、ハナは渡さん！",
              ], () => {
                // 闇の結界で弾き飛ばされる演出！
                G.shake = 22;
                Sfx.play("down");
                G.player.x = 1300;
                G.player.y = 820; // 吹き飛ばされる
                G.player.invT = 1.0;

                Dialogue.open("ハナ", [
                  "きゃあああっ！！ リイコーーッ！！",
                ], () => {
                  Dialogue.open("かげマント", [
                    "フフフ…ハナは北の『やみのしろ』へ連れていく！",
                    "貴様らごときに、魔王様の壮大なる野望は止められん！",
                    "闇の転移陣よ、開けッ！",
                  ], () => {
                    // ハナとかげマントが転移消滅
                    Sfx.play("solved");
                    G.actors = [];
                    // NPCのハナも消滅
                    G.npcs = G.npcs.filter((n) => n.id !== "s3_hana_cell");

                    Dialogue.open("リイコ", [
                      "ハナ……ッ！ ハナーーーッ！！",
                      "そんな……目の前にいたのに……あと一歩だったのに……！",
                    ], () => {
                      Dialogue.open("ミィ", [
                        "ニャウ…！（リイコ、泣かないでニャ！ まだ間に合うニャ！）",
                        "ニャーーーッ！（北の城へ飛んで行ったニャ！ おいかけるニャ！）",
                      ], () => {
                        Dialogue.open("ベル", [
                          "そうよ、リイコ！ 落ち込んでる暇なんてないわ！",
                          "あいつら、北の『やみのしろ』へ向かったわ！",
                          "アタシたち3人で、絶対にハナちゃんを助け出すわよ！！",
                        ], () => {
                          // 出口の扉を開放
                          for (const g of G.gates) {
                            if (g.id === "gate_exit") {
                              g.open = true;
                              G.obstacles = G.obstacles.filter((o) => o.gateId !== g.id);
                            }
                          }
                          G.flags.templeCleared = true;
                          Sfx.play("solved");
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        },
      },
    ],
  };
})();
