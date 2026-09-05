/* このファイルは マップ作成ツール（tools/map-editor.html）で 読み書きできます */
/* 2面「ささやきの谷」― 枯れた川をさかのぼり、ペンギンを助け、せき止め巨石を爆破する冒険 */
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
  { "shape": "rect", "x": 920, "y": 3200, "w": 360, "h": 320, "kind": "dirt" },
  { "shape": "circle", "x": 1100, "y": 3360, "r": 180, "kind": "dirt" },

  // 2) ベルの囚われ小広場（クモの巣）
  { "shape": "circle", "x": 1100, "y": 2900, "r": 190, "kind": "dirt" },
  { "shape": "rect", "x": 1000, "y": 2750, "w": 200, "h": 460, "kind": "dirt" },

  // 3) 枯れた川 下流〜中流（river: true）
  { "shape": "rect", "x": 990, "y": 2350, "w": 220, "h": 500, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 2600, "r": 140, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 4) 中流・ペンギンのオアシス広場
  { "shape": "circle", "x": 1100, "y": 2200, "r": 250, "kind": "grass2" },
  { "shape": "rect", "x": 900, "y": 2100, "w": 400, "h": 220, "kind": "grass" },

  // 5) 枯れた川 中流〜上流（爆弾岩と投石妨害エリア）
  { "shape": "rect", "x": 980, "y": 1400, "w": 240, "h": 720, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 1780, "r": 160, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 1450, "r": 160, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },

  // 左右の敵投石高台
  { "shape": "circle", "x": 780, "y": 1550, "r": 150, "kind": "stone2" },
  { "shape": "circle", "x": 1420, "y": 1380, "r": 150, "kind": "stone2" },
  { "shape": "rect", "x": 780, "y": 1520, "w": 220, "h": 60, "kind": "dirt" },
  { "shape": "rect", "x": 1200, "y": 1350, "w": 220, "h": 60, "kind": "dirt" },

  // 6) 枯れた川 上流〜せき止め巨石（ダム）
  { "shape": "rect", "x": 980, "y": 900, "w": 240, "h": 520, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 1120, "r": 160, "kind": "sand", "river": true, "dryKind": "sand", "dryColor": "#d2b589" },
  { "shape": "circle", "x": 1100, "y": 920, "r": 150, "kind": "stone" },

  // 7) 最上流・水源と出口（⛩️）
  { "shape": "rect", "x": 960, "y": 420, "w": 280, "h": 500, "kind": "water", "river": true, "dryKind": "water", "dryColor": "#4da6ff" },
  { "shape": "circle", "x": 1100, "y": 550, "r": 220, "kind": "water", "river": true, "dryKind": "water", "dryColor": "#4da6ff" },
  { "shape": "circle", "x": 1100, "y": 440, "r": 160, "kind": "stone" },

  // 8) 西の隠し広場（test-fairy互換: x:550, y:600）
  { "shape": "circle", "x": 550, "y": 600, "r": 180, "kind": "grass2" },
  { "shape": "rect", "x": 550, "y": 540, "w": 430, "h": 120, "kind": "dirt" }
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
   "x": 1100,
   "y": 1800,
   "r": 30,
   "size": 60,
   "sprite": "💣",
   "name": "ばくだん岩"
  }
 ],
 "objects": [
  // せき止め巨石（ダム: dam: true）
  { "id": "dam1", "x": 1030, "y": 910, "r": 36, "sprite": "🪨", "dam": true },
  { "id": "dam2", "x": 1090, "y": 890, "r": 40, "sprite": "🪨", "dam": true },
  { "id": "dam3", "x": 1150, "y": 895, "r": 38, "sprite": "🪨", "dam": true },
  { "id": "dam4", "x": 1060, "y": 935, "r": 32, "sprite": "🪨", "dam": true },
  { "id": "dam5", "x": 1120, "y": 935, "r": 32, "sprite": "🪨", "dam": true },
  { "id": "dam6", "x": 1180, "y": 920, "r": 34, "sprite": "🪨", "dam": true },

  // 谷の岩
  { "x": 840, "y": 2200, "r": 28, "sprite": "🪨" },
  { "x": 1360, "y": 2200, "r": 28, "sprite": "🪨" }
 ],
 "decorations": [
  { "x": 960, "y": 2180, "sprite": "🌿" },
  { "x": 1240, "y": 2220, "sprite": "🌼" },
  { "x": 1020, "y": 3280, "sprite": "🌿" },
  { "x": 1180, "y": 3280, "sprite": "🌿" }
 ],
 "markers": [
  { "x": 1100, "y": 3380, "type": "start" },
  { "x": 1100, "y": 2200, "type": "npc" },
  { "x": 1100, "y": 450, "type": "exit" }
 ],
 "player": {
  "x": 1100,
  "y": 3380,
  "sprite": "👧",
  "size": 68,
  "name": "リイコ",
  "maxHp": 3,
  "attack": 5
 },
 "enemies": [
  // 下流の巡回敵
  {
   "id": "s2e1",
   "x": 1100,
   "y": 2600,
   "sprite": "😾",
   "size": 58,
   "name": "たにの ネコ",
   "remember": true,
   "maxHp": 12,
   "attack": 1,
   "behavior": "patrol",
   "speed": 40,
   "patrolRange": 80,
   "walk": true
  },
  // 投石敵1（左岸の高台から石を投げる）
  {
   "id": "s2e_thrower1",
   "x": 840,
   "y": 1550,
   "sprite": "🐒",
   "size": 58,
   "name": "いしなげザル",
   "remember": true,
   "maxHp": 14,
   "attack": 1,
   "behavior": "shooter",
   "speed": 0,
   "shootInterval": 2.2,
   "shootRange": 340,
   "bulletSprite": "🪨",
   "bulletSpeed": 150,
   "bulletDamage": 1,
   "walk": true
  },
  // クモの巣のシャドウスパイダー（糸弾）
  {
   "id": "s2e_spider1",
   "x": 1220,
   "y": 2880,
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
  // 投石敵2（右岸の高台から石を投げる）
  {
   "id": "s2e_thrower2",
   "x": 1360,
   "y": 1380,
   "sprite": "🐒",
   "size": 58,
   "name": "いしなげザル",
   "remember": true,
   "maxHp": 14,
   "attack": 1,
   "behavior": "shooter",
   "speed": 0,
   "shootInterval": 2.4,
   "shootRange": 340,
   "bulletSprite": "🪨",
   "bulletSpeed": 150,
   "bulletDamage": 1,
   "walk": true
  },
  // 上流のコウモリ敵
  {
   "id": "s2e_bat1",
   "x": 1100,
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
  // 1) クモの巣（妖精ベル）
  {
   "id": "s2n1",
   "x": 1100,
   "y": 2900,
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
  // 2) ペンギン（川の水に困っている）
  {
   "id": "s2_penguin",
   "x": 1100,
   "y": 2180,
   "sprite": "🐧",
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
      "上流で だれかが 川を せき止めてるみたいなんだ。",
      "お願い、上流へ行って 川の様子を 見てきてくれないかい？"
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
  { "id": "s2cp1", "x": 1100, "y": 2280, "r": 70 },
  { "id": "s2cp2", "x": 1100, "y": 1880, "r": 70 }
 ],
 "triggers": [
  {
   "id": "s2_trig_web",
   "x": 1100,
   "y": 2960,
   "r": 70,
   "ifNot": "pikaJoined",
   "mutter": "（だれかの 声…？「ちょっと助けなさいよ！」って聞こえる）"
  },
  {
   "id": "s2_trig_dam_view",
   "x": 1100,
   "y": 1050,
   "r": 70,
   "ifNot": "riverFlowing",
   "mutter": "（大きな石が 川を せき止めている！ あの爆弾岩を 運んで 爆破できないかな…？）"
  }
 ],
 "gates": [],
 "exit": {
  "x": 1100,
  "y": 450,
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
    "（谷の すぐ北の クモの巣を 剣で 切って みよう）"
   ],
   "point": { "x": 1100, "y": 2900 }
  },
  {
   "ifNot": "riverFlowing",
   "lines": [
    "（川が せき止められて ペンギンが こまっている…）",
    "（上流にある「爆弾岩」を 後ろから 押して 運んでみよう）",
    "（敵の 投石を 爆弾岩で ガードしながら、せき止めの 巨石まで 運ぼう！）"
   ],
   "point": { "x": 1100, "y": 920 }
  },
  {
   "lines": [
    "（川が 流れて 道が ひらいた！）",
    "（上流の 鳥居から 次のステージへ 進もう！）"
   ],
   "point": { "x": 1100, "y": 450 }
  }
 ],
 "intro": null
};
