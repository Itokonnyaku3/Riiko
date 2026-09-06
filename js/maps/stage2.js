/* このファイルは マップ作成ツール（tools/map-editor.html）で 読み書きできます */
/* 2面「ささやきの谷」― 枯れた川をさかのぼり、2箇所の滝を迂回し、ペンギンを助け、せき止め巨石を爆破する冒険 */
window.MAPS = window.MAPS || {};
window.MAPS["stage2"] = /*MAPDATA*/{
 "name": "stage2",
 "title": "ささやきの谷",
 "updatedAt": 2000000000000,
 "world": {
  "width": 2200,
  "height": 3600,
  "ground": "#5e5750"
 },
 "areas": [
  // 1) 谷の入り口・下流スタート広場
  { "shape": "rect", "x": 960, "y": 3280, "w": 280, "h": 260, "kind": "dirt" },
  { "shape": "circle", "x": 1100, "y": 3420, "r": 150, "kind": "dirt" },

  // 枯れた川 最下流（スタート地点〜滝1手前）
  { "shape": "rect", "x": 1000, "y": 3050, "w": 200, "h": 260, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 2) 滝1前の右岸迂回路（手書き図の赤い線：右へ大きく迂回）
  { "shape": "rect", "x": 1150, "y": 3240, "w": 380, "h": 160, "kind": "dirt" },
  { "shape": "circle", "x": 1500, "y": 3260, "r": 160, "kind": "dirt" },
  { "shape": "circle", "x": 1750, "y": 3050, "r": 180, "kind": "grass2" },
  // クモの巣（妖精ベル囚われ地点）
  { "shape": "circle", "x": 1780, "y": 2750, "r": 190, "kind": "dirt" },
  { "shape": "circle", "x": 1650, "y": 2520, "r": 170, "kind": "grass2" },
  // 迂回路から橋への接続路
  { "shape": "rect", "x": 1180, "y": 2340, "w": 460, "h": 140, "kind": "dirt" },

  // 3) 枯れた川 中流（滝1の奥〜橋〜ペンギン広場）
  { "shape": "rect", "x": 1000, "y": 2480, "w": 200, "h": 500, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 2650, "r": 150, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 4) ペンギンのオアシス広場（橋の南側・川岸）
  { "shape": "circle", "x": 1100, "y": 2550, "r": 180, "kind": "grass2" },

  // 5) 川にかかる「はし（橋）」の足場
  { "shape": "rect", "x": 920, "y": 2340, "w": 360, "h": 120, "kind": "wood" },

  // 6) 滝2前の左岸迂回路（手書き図の赤い線：橋を渡って左へ迂回して北上）
  { "shape": "circle", "x": 840, "y": 2380, "r": 160, "kind": "dirt" },
  { "shape": "circle", "x": 680, "y": 2150, "r": 170, "kind": "stone2" },
  { "shape": "circle", "x": 620, "y": 1850, "r": 180, "kind": "stone2" },
  { "shape": "circle", "x": 680, "y": 1550, "r": 180, "kind": "dirt" },
  { "shape": "rect", "x": 680, "y": 1320, "w": 350, "h": 180, "kind": "dirt" },

  // 投石敵（いしなげザル）の高台
  { "shape": "circle", "x": 500, "y": 1850, "r": 130, "kind": "stone" },
  { "shape": "circle", "x": 850, "y": 1800, "r": 130, "kind": "stone" },

  // 7) 枯れた川 中上流（滝2〜せき止め石）
  { "shape": "rect", "x": 1000, "y": 1400, "w": 200, "h": 720, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 1750, "r": 150, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 8) 上流広場（手書き図の「広場」）
  { "shape": "circle", "x": 1050, "y": 1150, "r": 280, "kind": "grass2" },
  { "shape": "rect", "x": 860, "y": 950, "w": 420, "h": 320, "kind": "grass" },

  // 9) 北のバクダン岩エリア（手書き図の広場北側「バクダン岩」）
  { "shape": "circle", "x": 1050, "y": 920, "r": 160, "kind": "dirt" },

  // 10) 南東のせき止め石（ダム）への運搬ルート（手書き図の赤い矢印）
  { "shape": "rect", "x": 1080, "y": 1220, "w": 280, "h": 200, "kind": "dirt" },
  { "shape": "circle", "x": 1280, "y": 1350, "r": 160, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 11) 北東の「湖」（手書き図の「湖」）
  { "shape": "rect", "x": 1240, "y": 800, "w": 480, "h": 460, "kind": "water", "river": true, "dryKind": "water", "dryColor": "#4da6ff" },
  { "shape": "circle", "x": 1500, "y": 950, "r": 240, "kind": "water", "river": true, "dryKind": "water", "dryColor": "#4da6ff" },
  { "shape": "circle", "x": 1650, "y": 800, "r": 200, "kind": "water", "river": true, "dryKind": "water", "dryColor": "#4da6ff" },

  // 12) 最上流・水源と出口（⛩️）
  { "shape": "circle", "x": 1650, "y": 620, "r": 160, "kind": "stone" },
  { "shape": "rect", "x": 1550, "y": 550, "w": 200, "h": 220, "kind": "dirt" },

  // 13) 西の隠し広場（宝箱: test-fairy, test-save互換）
  { "shape": "circle", "x": 520, "y": 600, "r": 180, "kind": "grass2" },
  { "shape": "rect", "x": 520, "y": 560, "w": 450, "h": 120, "kind": "dirt" }
 ],
 "fill": {
  "on": true,
  "sprite": "🪨",
  "r": 24,
  "gap": 54,
  "jitter": 12,
  "margin": 26,
  "exclude": []
 },
 "boulders": [
  {
   "id": "s2_bomb1",
   "x": 1050,
   "y": 920,
   "r": 30,
   "size": 60,
   "sprite": "💣",
   "name": "ばくだん岩"
  },
  {
   "id": "s2_bomb2",
   "x": 1130,
   "y": 910,
   "r": 30,
   "size": 60,
   "sprite": "💣",
   "name": "ばくだん岩（予備）"
  }
 ],
 "objects": [
  // ---- 滝1（下流の滝・ガケ：川を登れないように完全封鎖）----
  { "id": "wf1_l2", "x": 920, "y": 3010, "r": 42, "sprite": "cliff" },
  { "id": "wf1_l",  "x": 1000, "y": 3000, "r": 42, "sprite": "cliff-wall" },
  { "id": "wf1",    "x": 1100, "y": 2990, "r": 44, "sprite": "waterfall" },
  { "id": "wf1_r",  "x": 1200, "y": 3000, "r": 42, "sprite": "cliff-wall" },
  { "id": "wf1_r2", "x": 1280, "y": 3010, "r": 42, "sprite": "cliff" },

  // ---- 滝2（中流の滝・ガケ：橋の北で川を登れないように完全封鎖）----
  { "id": "wf2_l2", "x": 920, "y": 2180, "r": 42, "sprite": "cliff" },
  { "id": "wf2_l",  "x": 1000, "y": 2170, "r": 42, "sprite": "cliff-wall" },
  { "id": "wf2",    "x": 1100, "y": 2160, "r": 44, "sprite": "waterfall" },
  { "id": "wf2_r",  "x": 1200, "y": 2170, "r": 42, "sprite": "cliff-wall" },
  { "id": "wf2_r2", "x": 1280, "y": 2180, "r": 42, "sprite": "cliff" },

  // ---- 川にかかる「はし（橋）」----
  { "id": "bridge1", "x": 1100, "y": 2400, "r": 0, "sprite": "bridge" },

  // ---- せき止め巨石（ダム: dam: true 手書き図の南東の石）----
  { "id": "dam1", "x": 1220, "y": 1330, "r": 36, "sprite": "🪨", "dam": true },
  { "id": "dam2", "x": 1270, "y": 1310, "r": 40, "sprite": "🪨", "dam": true },
  { "id": "dam3", "x": 1320, "y": 1320, "r": 38, "sprite": "🪨", "dam": true },
  { "id": "dam4", "x": 1240, "y": 1370, "r": 34, "sprite": "🪨", "dam": true },
  { "id": "dam5", "x": 1290, "y": 1370, "r": 36, "sprite": "🪨", "dam": true },
  { "id": "dam6", "x": 1340, "y": 1350, "r": 32, "sprite": "🪨", "dam": true },

  // 谷の岩
  { "x": 880, "y": 2550, "r": 28, "sprite": "🪨" },
  { "x": 1320, "y": 2550, "r": 28, "sprite": "🪨" }
 ],
 "decorations": [
  { "x": 1040, "y": 2540, "sprite": "🌿" },
  { "x": 1160, "y": 2560, "sprite": "🌼" },
  { "x": 1020, "y": 3420, "sprite": "🌿" },
  { "x": 1180, "y": 3420, "sprite": "🌿" }
 ],
 "markers": [
  { "x": 1100, "y": 3420, "type": "start" },
  { "x": 1100, "y": 2550, "type": "npc" },
  { "x": 1650, "y": 620, "type": "exit" }
 ],
 "player": {
  "x": 1100,
  "y": 3420,
  "sprite": "👧",
  "size": 68,
  "name": "リイコ",
  "maxHp": 3,
  "attack": 5
 },
 "enemies": [
  // 滝1手前の巡回敵
  {
   "id": "s2e1",
   "x": 1100,
   "y": 3150,
   "sprite": "😾",
   "size": 58,
   "name": "たにの ネコ",
   "remember": true,
   "maxHp": 12,
   "attack": 1,
   "behavior": "patrol",
   "speed": 40,
   "patrolRange": 60,
   "walk": true
  },
  // 右岸迂回路のシャドウスパイダー（クモの巣を守る）
  {
   "id": "s2e_spider1",
   "x": 1850,
   "y": 2720,
   "sprite": "🕷️",
   "size": 58,
   "name": "シャドウスパイダー",
   "remember": true,
   "maxHp": 15,
   "attack": 2,
   "behavior": "shooter",
   "speed": 35,
   "shootInterval": 2.2,
   "shootRange": 280,
   "bulletType": "web",
   "bulletSpeed": 140,
   "walk": true,
   "walkKey": "spider"
  },
  // 左岸迂回路の投石敵1（高台から石を投げる）
  {
   "id": "s2e_thrower1",
   "x": 520,
   "y": 1850,
   "sprite": "🐒",
   "size": 58,
   "name": "いしなげザル",
   "remember": true,
   "maxHp": 14,
   "attack": 1,
   "behavior": "shooter",
   "speed": 0,
   "shootInterval": 2.2,
   "shootRange": 360,
   "bulletSprite": "🪨",
   "bulletSpeed": 150,
   "bulletDamage": 1,
   "walk": true
  },
  // 左岸迂回路の投石敵2（右の高台から石を投げる）
  {
   "id": "s2e_thrower2",
   "x": 840,
   "y": 1800,
   "sprite": "🐒",
   "size": 58,
   "name": "いしなげザル",
   "remember": true,
   "maxHp": 14,
   "attack": 1,
   "behavior": "shooter",
   "speed": 0,
   "shootInterval": 2.4,
   "shootRange": 360,
   "bulletSprite": "🪨",
   "bulletSpeed": 150,
   "bulletDamage": 1,
   "walk": true
  },
  // 広場のコウモリ敵
  {
   "id": "s2e_bat1",
   "x": 1050,
   "y": 1150,
   "sprite": "🦇",
   "size": 54,
   "name": "ヤミコウモリ",
   "remember": true,
   "maxHp": 10,
   "attack": 1,
   "behavior": "chase",
   "speed": 55,
   "sight": 220,
   "walk": true,
   "walkKey": "bat"
  }
 ],
 "npcs": [
  // 1) クモの巣（妖精ベル）― 右岸迂回路の奥
  {
   "id": "s2n1",
   "x": 1780,
   "y": 2750,
   "sprite": "🕸️",
   "name": "クモのす（妖精ベル）",
   "r": 50,
   "ifNot": "pikaJoined",
   "set": "pikaJoined",
   "lines": [
    "…きゃあっ！ ちょっと、そこの アンタ！ 見てないで さっさと 助けなさいよ！",
    "（リイコは 剣で クモの巣を 切り裂いた！）",
    "ふん、助けてくれて感謝してるわよ！",
    "何、あいつらのところに行くの？よし、私もついてくわ。"
   ]
  },
  // 2) ペンギン（川の水に困っている）― 橋の南側のオアシス
  {
   "id": "s2_penguin",
   "x": 1100,
   "y": 2550,
   "sprite": "🐧",
   "walkKey": "penta",
   "walk": true,
   "size": 76,
   "name": "ペンギンの ペンタ",
   "r": 48,
   "variants": [
    {
     "if": "riverFlowing",
     "lines": [
      "わあーっ！ 川に つめたい 水が 戻ってきたよ！！",
      "ざばざば 流れて、とっても 気持ちいいや！ お魚も たくさん 泳いでる！",
      "リイコちゃん、ベルちゃん、本当に ありがとう！",
      "せき止められていた 岩の 先の道も、すっかり 通れるように なったよ！"
     ]
    },
    {
     "lines": [
      "うう… こまったなあ… 川の水が ぜんぜん 流れてこないんだ…",
      "このままだと ぼくたち ペンギンは 水浴びも できないし、お魚も 取れないよ…",
      "上流の 滝の 先で、だれかが 川を せき止めてるみたいなんだ。",
      "お願い、迂回路を 通って 上流へ行って 川の様子を 見てきてくれないかい？"
     ]
    }
   ]
  }
 ],
 "chests": [
  {
   "id": "s2c1",
   "x": 520,
   "y": 580,
   "message": "「谷のすず」を 手に入れた！✨",
   "item": "谷のすず"
  }
 ],
 "checkpoints": [
  { "id": "s2cp1", "x": 1100, "y": 2450, "r": 70 },
  { "id": "s2cp2", "x": 1050, "y": 1250, "r": 70 }
 ],
 "triggers": [
  {
   "id": "s2_trig_waterfall1",
   "x": 1100,
   "y": 3060,
   "r": 70,
   "mutter": "（高い ガケと 滝で 川を のぼれない…！ 右の道から 回り道してみよう）"
  },
  {
   "id": "s2_trig_web",
   "x": 1780,
   "y": 2820,
   "r": 70,
   "ifNot": "pikaJoined",
   "mutter": "（だれかの 声…？「ちょっと助けなさいよ！」って聞こえる）"
  },
  {
   "id": "s2_trig_waterfall2",
   "x": 1100,
   "y": 2240,
   "r": 70,
   "mutter": "（ここも 滝になっていて 川からは 進めない！ 左の 山道から まわろう）"
  },
  {
   "id": "s2_trig_dam_view",
   "x": 1200,
   "y": 1390,
   "r": 70,
   "ifNot": "riverFlowing",
   "mutter": "（大きな石が 川を せき止めている！ 広場にある爆弾岩を 運んで 爆破できないかな…？）"
  }
 ],
 "gates": [],
 "exit": {
  "x": 1650,
  "y": 620,
  "r": 50,
  "requireBoss": false,
  "label": "つぎのステージへ",
  "lines": [
   "川の 上流を ぬけて、しずかな 湖へ やってきた！",
   "ハナちゃんを さがす 旅は まだまだ つづく…！🎉"
  ]
 },
 "hints": [
  {
   "ifNot": "pikaJoined",
   "lines": [
    "（谷の おくから、小さな 声が きこえる…）",
    "（何かが たすけを もとめて いる みたい）",
    "（東の 迂回路の クモの巣を 剣で 切って みよう）"
   ],
   "point": { "x": 1780, "y": 2750 }
  },
  {
   "ifNot": "riverFlowing",
   "lines": [
    "（川が せき止められて ペンギンが こまっている…）",
    "（広場の 北にある「爆弾岩」を 後ろから 押して 運んでみよう）",
    "（敵の 激しい投石を 爆弾岩の 陰に隠れて やりすごし、せき止め巨石まで 運ぼう！）"
   ],
   "point": { "x": 1280, "y": 1350 }
  },
  {
   "lines": [
    "（川が 流れて 道が ひらいた！）",
    "（湖の 先にある 鳥居から 次のステージへ 進もう！）"
   ],
   "point": { "x": 1650, "y": 620 }
  }
 ],
 "intro": null
};
