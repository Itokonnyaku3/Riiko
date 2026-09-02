/* このファイルは マップ作成ツール（tools/map-editor.html）で 読み書きできます */
/* 2面「ささやきの谷」― まだ かりの かたち。Ph6 で 作りこみます */
window.MAPS = window.MAPS || {};
window.MAPS["stage2"] = /*MAPDATA*/{
 "name": "stage2",
 "title": "ささやきの谷",
 "world": {
  "width": 2200,
  "height": 1800,
  "ground": "#6b6560"
 },
 "areas": [
  {
   "shape": "rect",
   "x": 840,
   "y": 1280,
   "w": 520,
   "h": 440,
   "kind": "dirt"
  },
  {
   "shape": "rect",
   "x": 600,
   "y": 760,
   "w": 1000,
   "h": 560,
   "kind": "grass"
  },
  {
   "shape": "circle",
   "x": 1640,
   "y": 940,
   "r": 220,
   "kind": "grass2"
  },
  {
   "shape": "rect",
   "x": 960,
   "y": 360,
   "w": 280,
   "h": 440,
   "kind": "dirt"
  },
  {
   "shape": "circle",
   "x": 1100,
   "y": 340,
   "r": 240,
   "kind": "stone"
  }
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
 "objects": [
  {
   "x": 600,
   "y": 600,
   "r": 24,
   "sprite": "🪨"
  },
  {
   "x": 1600,
   "y": 600,
   "r": 24,
   "sprite": "🪨"
  }
 ],
 "decorations": [
  {
   "x": 840,
   "y": 1120,
   "sprite": "🌿"
  },
  {
   "x": 1400,
   "y": 1040,
   "sprite": "🌼"
  },
  {
   "x": 1120,
   "y": 600,
   "sprite": "🕸️"
  }
 ],
 "markers": [
  {
   "x": 1100,
   "y": 1600,
   "type": "start"
  },
  {
   "x": 1120,
   "y": 600,
   "type": "npc"
  },
  {
   "x": 1100,
   "y": 300,
   "type": "exit"
  }
 ],
 "player": {
  "x": 1100,
  "y": 1600,
  "sprite": "👧",
  "size": 68,
  "name": "リイコ",
  "maxHp": 3,
  "attack": 5
 },
 "enemies": [
  {
   "id": "s2e1",
   "x": 840,
   "y": 940,
   "sprite": "😾",
   "size": 58,
   "name": "たにの ネコ",
   "remember": true,
   "maxHp": 14,
   "attack": 2,
   "behavior": "patrol",
   "speed": 44,
   "patrolRange": 90,
   "walk": true
  }
 ],
 "npcs": [
  {
   "id": "s2n1",
   "x": 1120,
   "y": 660,
   "sprite": "🕸️",
   "name": "クモの す",
   "r": 46,
   "ifNot": "pikaJoined",
   "set": "pikaJoined",
   "lines": [
    "…きゃあっ！ ちょっと、そこの アンタ！",
    "見てないで さっさと 助けなさいよ！",
    "（クモの巣に、小さな 妖精が ひっかかって いる）",
    "リイコは 剣で そっと 巣を 切った。"
   ]
  },
  {
   "id": "s2n2",
   "x": 1200,
   "y": 660,
   "sprite": "🧚",
   "name": "妖精の ベル",
   "if": "pikaJoined",
   "r": 40,
   "variants": [
    {
     "minTalks": 2,
     "lines": [
      "アタシの ヒントは 一級品なんだから、感謝しなさいよね！",
      "こまったら すぐ 💡 を おすのよ、リイコ！"
     ]
    },
    {
     "lines": [
      "ふん、やっと 出られたわ！ …ま、一応 お礼は 言っておくわね。アタシは ベル！",
      "え？ やみのしろへ 行きたいの？ ふふっ…あいつらの アジトなら よーく 知ってるわ。",
      "アタシを 裏切って 置き去りに したこと、ぜったい 後悔させて やるんだから！",
      "道案内して あげるから、アタシを 連れていきなさい！ こまったら 💡ボタンよ！"
     ]
    }
   ]
  }
 ],
 "chests": [],
 "checkpoints": [
  {
   "id": "s2cp1",
   "x": 1100,
   "y": 1000,
   "r": 70
  }
 ],
 "triggers": [
  {
   "id": "s2-web",
   "x": 1120,
   "y": 720,
   "r": 70,
   "ifNot": "pikaJoined",
   "mutter": "（だれかの 声…？「ちょっと助けなさいよ！」って聞こえる）"
  }
 ],
 "gates": [],
 "exit": {
  "x": 1100,
  "y": 300,
  "r": 50,
  "requireBoss": false,
  "label": "つづく",
  "lines": [
   "ここから さきは、これから 作ります。",
   "あそんで くれて ありがとう！🎉"
  ]
 },
 "hints": [
  {
   "ifNot": "pikaJoined",
   "lines": [
    "（谷の おくから、小さな 声が きこえる…）",
    "（何かが たすけを もとめて いる みたい）",
    "（谷の おくの クモの巣を 剣で 切って みよう）"
   ],
   "point": {
    "x": 1120,
    "y": 660
   }
  },
  {
   "lines": [
    "（もっと 北へ 行って みよう）",
    "（谷の おくに 道が ある）",
    "（いちばん 北を めざそう）"
   ],
   "point": {
    "x": 1100,
    "y": 340
   }
  }
 ],
 "intro": null
};
