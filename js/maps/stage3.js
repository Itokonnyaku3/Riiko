/* このファイルは マップ作成ツール（tools/map-editor.html）で 読み書きできます */
/* 3面「静寂の湖」― 湖畔の船着き場、木道と浅瀬の分岐、湖上砦での包囲戦とミィ参戦、水上神殿とハナ遭遇ドラマ */
window.MAPS = window.MAPS || {};
window.MAPS["stage3"] = /*MAPDATA*/{
 "name": "stage3",
 "title": "静寂の湖",
 "updatedAt": 2600000000000,
 "world": {
  "width": 2600,
  "height": 3800,
  "ground": "#2d443e"
 },
 "areas": [
  // 1) 南部スタート地点・湖畔の船着き場
  { "shape": "rect", "x": 1100, "y": 3400, "w": 400, "h": 280, "kind": "sand" },
  { "shape": "circle", "x": 1300, "y": 3520, "r": 180, "kind": "dirt" },
  { "shape": "rect", "x": 1220, "y": 3280, "w": 160, "h": 160, "kind": "wood" },

  // 巨大な湖水（周囲一面に広がる水域）
  { "shape": "rect", "x": 200, "y": 400, "w": 2200, "h": 2900, "kind": "water" },

  // 2) 西ルート：崩れかけた木道群（敵多め・スリルルート）
  { "shape": "rect", "x": 650, "y": 3200, "w": 580, "h": 100, "kind": "wood" },
  { "shape": "circle", "x": 650, "y": 3150, "r": 100, "kind": "wood" },
  { "shape": "rect", "x": 600, "y": 2750, "w": 100, "h": 400, "kind": "wood" },
  { "shape": "circle", "x": 650, "y": 2700, "r": 110, "kind": "stone2" },
  { "shape": "rect", "x": 650, "y": 2650, "w": 300, "h": 100, "kind": "wood" },
  { "shape": "circle", "x": 950, "y": 2600, "r": 100, "kind": "stone2" },
  { "shape": "rect", "x": 900, "y": 2300, "w": 100, "h": 320, "kind": "wood" },
  { "shape": "rect", "x": 950, "y": 2300, "w": 200, "h": 100, "kind": "wood" },

  // 3) 東ルート：浅瀬の小島群（ブーメラン遠隔スイッチルート）
  { "shape": "rect", "x": 1360, "y": 3280, "w": 400, "h": 100, "kind": "sand" },
  { "shape": "circle", "x": 1800, "y": 3200, "r": 140, "kind": "sand" },
  { "shape": "circle", "x": 1950, "y": 2950, "r": 130, "kind": "stone2" },
  { "shape": "rect", "x": 1780, "y": 2900, "w": 180, "h": 100, "kind": "wood" },
  { "shape": "circle", "x": 1700, "y": 2850, "r": 130, "kind": "sand" },
  // スイッチのある孤島（歩いては行けない離れた小島）
  { "shape": "circle", "x": 2150, "y": 2700, "r": 110, "kind": "stone" },
  // 水門の先の接続木道
  { "shape": "rect", "x": 1650, "y": 2550, "w": 100, "h": 220, "kind": "wood" },
  { "shape": "circle", "x": 1650, "y": 2450, "r": 120, "kind": "stone2" },
  { "shape": "rect", "x": 1450, "y": 2300, "w": 250, "h": 100, "kind": "wood" },

  // 4) 中央合流地点：湖上砦広場（包囲戦とミィ参戦の舞台）
  { "shape": "rect", "x": 1050, "y": 2050, "w": 500, "h": 320, "kind": "stone" },
  { "shape": "circle", "x": 1300, "y": 2200, "r": 220, "kind": "stone" },

  // 湖上砦から北部神殿への大橋
  { "shape": "rect", "x": 1240, "y": 1650, "w": 120, "h": 420, "kind": "stone2" },
  { "shape": "circle", "x": 1300, "y": 1650, "r": 130, "kind": "stone" },

  // 5) 水上神殿：外郭と回廊
  { "shape": "rect", "x": 1050, "y": 1200, "w": 500, "h": 460, "kind": "stone" },
  { "shape": "circle", "x": 950, "y": 1400, "r": 120, "kind": "stone2" },
  { "shape": "circle", "x": 1650, "y": 1400, "r": 120, "kind": "stone2" },
  { "shape": "rect", "x": 950, "y": 1350, "w": 700, "h": 100, "kind": "stone" },

  // 6) 神殿最奥：本殿・牢屋エリア（ハナ遭遇・かげマント強襲）
  { "shape": "rect", "x": 1100, "y": 550, "w": 400, "h": 500, "kind": "stone" },
  { "shape": "circle", "x": 1300, "y": 700, "r": 190, "kind": "stone" },
  // 牢屋の中の床
  { "shape": "rect", "x": 1240, "y": 500, "w": 120, "h": 100, "kind": "dirt" },

  // 7) 北の山道・出口エリア
  { "shape": "rect", "x": 1230, "y": 200, "w": 140, "h": 320, "kind": "dirt" },
  { "shape": "circle", "x": 1300, "y": 260, "r": 120, "kind": "dirt" }
 ],
 "fill": {
  "on": true,
  "sprite": "tree-big",
  "r": 28,
  "gap": 60,
  "jitter": 12,
  "margin": 30,
  "exclude": []
 },
 "player": {
  "x": 1300,
  "y": 3550,
  "maxHp": 4,
  "attack": 6
 },
 "checkpoints": [
  { "id": "cp_start", "x": 1300, "y": 3520 },
  { "id": "cp_fort", "x": 1300, "y": 2200 },
  { "id": "cp_temple", "x": 1300, "y": 1450 }
 ],
 "boulders": [],
 "obstacles": [
  // 船着き場の杭・柵
  { "x": 1150, "y": 3480, "r": 12, "sprite": "post" },
  { "x": 1450, "y": 3480, "r": 12, "sprite": "post" },

  // 西ルートの障害岩・壊れた樽
  { "x": 650, "y": 2900, "r": 18, "sprite": "barrel" },
  { "x": 750, "y": 2660, "r": 20, "sprite": "rocks" },

  // 東ルートの岩礁
  { "x": 1820, "y": 3050, "r": 24, "sprite": "rock-big" },
  { "x": 1680, "y": 2720, "r": 20, "sprite": "rocks-moss" },

  // 孤島の装飾石
  { "x": 2150, "y": 2660, "r": 16, "sprite": "rock-b" },

  // 湖上砦の四隅の柱
  { "x": 1100, "y": 2080, "r": 24, "sprite": "rock-big" },
  { "x": 1500, "y": 2080, "r": 24, "sprite": "rock-big" },
  { "x": 1100, "y": 2340, "r": 24, "sprite": "rock-big" },
  { "x": 1500, "y": 2340, "r": 24, "sprite": "rock-big" },

  // 神殿の石柱
  { "x": 1150, "y": 1300, "r": 22, "sprite": "rock-d" },
  { "x": 1450, "y": 1300, "r": 22, "sprite": "rock-d" },
  { "x": 1150, "y": 1550, "r": 22, "sprite": "rock-d" },
  { "x": 1450, "y": 1550, "r": 22, "sprite": "rock-d" },

  // 最奥の牢屋の柵（ハナが閉じ込められている）
  { "x": 1220, "y": 550, "r": 16, "sprite": "fence-tall" },
  { "x": 1380, "y": 550, "r": 16, "sprite": "fence-tall" }
 ],
 "decorations": [
  // 遠景の湖
  { "x": 300, "y": 300, "sprite": "scenery-lake" },
  { "x": 2200, "y": 300, "sprite": "scenery-lake" },

  // 船着き場の草花
  { "x": 1200, "y": 3580, "sprite": "bush-blue" },
  { "x": 1380, "y": 3580, "sprite": "bush-white" },

  // 湖面の水草
  { "x": 800, "y": 3000, "sprite": "leaf" },
  { "x": 1800, "y": 2600, "sprite": "leaf" },
  { "x": 1100, "y": 1700, "sprite": "leaf" },
  { "x": 1500, "y": 1700, "sprite": "leaf" }
 ],
 "gates": [
  // 東ルートの水門（ブーメランでスイッチを叩くと開く）
  {
   "id": "gate_east",
   "x": 1700,
   "y": 2650,
   "name": "水門",
   "wall": [
    { "x": 1680, "y": 2650, "r": 20, "sprite": "fence-long" },
    { "x": 1720, "y": 2650, "r": 20, "sprite": "fence-long" }
   ]
  },
  // 砦の罠ゲート（南側の退路を塞ぐ柵）
  {
   "id": "gate_trap",
   "x": 1300,
   "y": 2360,
   "name": "砦の鉄柵",
   "wall": [
    { "x": 1260, "y": 2360, "r": 22, "sprite": "fence-tall" },
    { "x": 1340, "y": 2360, "r": 22, "sprite": "fence-tall" }
   ]
  },
  // 砦の北ゲート（敵全滅で開く）
  {
   "id": "gate_north",
   "x": 1300,
   "y": 1950,
   "name": "砦の大扉",
   "wall": [
    { "x": 1260, "y": 1950, "r": 22, "sprite": "gate" },
    { "x": 1340, "y": 1950, "r": 22, "sprite": "gate" }
   ]
  },
  // 神殿奥の結界扉（ハナ連れ去り後に山道への道が開く）
  {
   "id": "gate_exit",
   "x": 1300,
   "y": 380,
   "name": "神殿の奥扉",
   "wall": [
    { "x": 1260, "y": 380, "r": 20, "sprite": "gate" },
    { "x": 1340, "y": 380, "r": 20, "sprite": "gate" }
   ]
  }
 ],
 "crystalSwitches": [
  // 東ルートの孤島スイッチ（ブーメラン遠隔起動用）
  {
   "id": "sw_east",
   "x": 2150,
   "y": 2700,
   "r": 26,
   "flag": "sw_east_active",
   "targetGateId": "gate_east",
   "name": "青水晶のスイッチ",
   "message": "カチッ！ 遠くの水門が開いた！"
  },
  // 神殿内の跳ね橋スイッチ
  {
   "id": "sw_temple",
   "x": 950,
   "y": 1350,
   "r": 26,
   "flag": "sw_temple_active",
   "targetGateId": "gate_north",
   "name": "水神のスイッチ",
   "message": "神殿の扉が開いた！"
  }
 ],
 "enemies": [
  // 西ルートの敵（イノシシ・コウモリ）
  {
   "id": "s3_e1",
   "x": 650,
   "y": 2980,
   "sprite": "🦇",
   "behavior": "chase",
   "speed": 55,
   "maxHp": 8,
   "attack": 2,
   "walkKey": "bat"
  },
  {
   "id": "s3_e2",
   "x": 650,
   "y": 2800,
   "sprite": "🐗",
   "behavior": "charge",
   "speed": 40,
   "maxHp": 12,
   "attack": 3,
   "walkKey": "boar"
  },
  {
   "id": "s3_e3",
   "x": 800,
   "y": 2650,
   "sprite": "🦇",
   "behavior": "chase",
   "speed": 60,
   "maxHp": 8,
   "attack": 2,
   "walkKey": "bat"
  },

  // 東ルートの敵（水辺のクモ）
  {
   "id": "s3_e4",
   "x": 1800,
   "y": 3150,
   "sprite": "🕷️",
   "behavior": "patrol",
   "speed": 45,
   "maxHp": 10,
   "attack": 2,
   "walkKey": "spider"
  },
  {
   "id": "s3_e5",
   "x": 1700,
   "y": 2780,
   "sprite": "🕷️",
   "behavior": "patrol",
   "speed": 45,
   "maxHp": 10,
   "attack": 2,
   "walkKey": "spider"
  },

  // 中央砦の包囲敵（ミィ参戦で共闘する手強い敵群）
  {
   "id": "s3_e_shield1",
   "x": 1220,
   "y": 2120,
   "sprite": "🐢",
   "behavior": "shield",
   "speed": 34,
   "maxHp": 14,
   "attack": 3,
   "walkKey": "enemy"
  },
  {
   "id": "s3_e_shield2",
   "x": 1380,
   "y": 2120,
   "sprite": "🐢",
   "behavior": "shield",
   "speed": 34,
   "maxHp": 14,
   "attack": 3,
   "walkKey": "enemy"
  },
  {
   "id": "s3_e_bat1",
   "x": 1150,
   "y": 2220,
   "sprite": "🦇",
   "behavior": "chase",
   "speed": 55,
   "maxHp": 8,
   "attack": 2,
   "walkKey": "bat"
  },
  {
   "id": "s3_e_bat2",
   "x": 1450,
   "y": 2220,
   "sprite": "🦇",
   "behavior": "chase",
   "speed": 55,
   "maxHp": 8,
   "attack": 2,
   "walkKey": "bat"
  },

  // 神殿回廊の精鋭敵
  {
   "id": "s3_e_temple1",
   "x": 1200,
   "y": 1400,
   "sprite": "🐗",
   "behavior": "charge",
   "speed": 45,
   "maxHp": 14,
   "attack": 3,
   "walkKey": "boar"
  },
  {
   "id": "s3_e_temple2",
   "x": 1400,
   "y": 1400,
   "sprite": "🐢",
   "behavior": "shield",
   "speed": 36,
   "maxHp": 16,
   "attack": 3,
   "walkKey": "enemy"
  }
 ],
 "npcs": [
  // 船着き場の案内看板
  {
   "id": "s3_sign_dock",
   "x": 1280,
   "y": 3460,
   "sprite": "🪧",
   "name": "湖畔の道しるべ",
   "lines": [
    "【静寂の湖 道しるべ】",
    "← 西：崩れかけの木道（魔物が多いが近道）",
    "→ 東：浅瀬と小島（水門あり・スイッチを狙え）"
   ]
  }
 ],
 "chests": [
  // 西ルートの隠し宝箱
  {
   "id": "s3_c1",
   "x": 650,
   "y": 2600,
   "item": "いのちのしずく",
   "message": "いのちのしずくを 手に入れた！ ハートが ぜんかいふく！"
  },
  // 東ルートの宝箱
  {
   "id": "s3_c2",
   "x": 1950,
   "y": 2900,
   "item": "きんのコイン",
   "message": "きんのコインを 手に入れた！"
  },
  // 神殿内の秘宝
  {
   "id": "s3_c3",
   "x": 1650,
   "y": 1350,
   "item": "ふしぎな羽",
   "message": "ふしぎな羽を 手に入れた！ 体が 軽くなった 気がする！"
  }
 ],
 "triggers": [
  // 冒頭ベルの会話トリガー
  {
   "id": "trig_s3_intro",
   "x": 1300,
   "y": 3380,
   "r": 60,
   "name": "ベル",
   "lines": [
    "ここが「静寂の湖」ね…！",
    "見て、リイコ！ 向こうの湖の中央に大きな神殿が見えるわ！",
    "ハナちゃんはきっとあそこに捕まっているはずよ！",
    "でも道が二手に分かれてるわね…どうやって渡る？"
   ]
  },
  // 砦の罠トリガー（柵が閉まり、包囲ピンチ→ミィ乱入）
  {
   "id": "trig_fort_trap",
   "x": 1300,
   "y": 2180,
   "r": 80
  },
  // 神殿奥のハナ発見・かげマント強襲トリガー
  {
   "id": "trig_temple_hana",
   "x": 1300,
   "y": 680,
   "r": 70
  }
 ],
 "exit": {
  "x": 1300,
  "y": 240,
  "requireBoss": false,
  "label": "4面 やみのしろ へ",
  "lines": [
   "湖の奥の山道を抜けると、目の前にそびえ立つ「やみのしろ」が迫ってきた…！",
   "リイコ「ハナ、待ってて…！ 今度こそ、絶対に助け出すから！」",
   "ミィ「ニャーーーン！！」",
   "ベル「覚悟しなさいよ、魔王！ 4面『やみのしろ』へ突入よ！」"
  ]
 }
};
