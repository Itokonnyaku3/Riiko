/* このファイルは マップ作成ツール（tools/map-editor.html）で 読み書きできます */
/* 2面「ささやきの谷」― まだ かりの かたち。Ph6 で 作りこみます */
window.MAPS = window.MAPS || {};
window.MAPS["stage2"] = /*MAPDATA*/{
 "name": "stage2",
 "title": "ささやきの谷",
 "world": {
  "width": 1100,
  "height": 900,
  "ground": "#6b6560"
 },
 "areas": [
  {
   "shape": "rect",
   "x": 420,
   "y": 640,
   "w": 260,
   "h": 220,
   "kind": "dirt"
  },
  {
   "shape": "rect",
   "x": 300,
   "y": 380,
   "w": 500,
   "h": 280,
   "kind": "grass"
  },
  {
   "shape": "circle",
   "x": 820,
   "y": 470,
   "r": 110,
   "kind": "grass2"
  },
  {
   "shape": "rect",
   "x": 480,
   "y": 180,
   "w": 140,
   "h": 220,
   "kind": "dirt"
  },
  {
   "shape": "circle",
   "x": 550,
   "y": 170,
   "r": 120,
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
   "x": 300,
   "y": 300,
   "r": 24,
   "sprite": "🪨"
  },
  {
   "x": 800,
   "y": 300,
   "r": 24,
   "sprite": "🪨"
  }
 ],
 "decorations": [
  {
   "x": 420,
   "y": 560,
   "sprite": "🌿"
  },
  {
   "x": 700,
   "y": 520,
   "sprite": "🌼"
  },
  {
   "x": 560,
   "y": 300,
   "sprite": "🕸️"
  }
 ],
 "markers": [
  {
   "x": 550,
   "y": 800,
   "type": "start"
  },
  {
   "x": 560,
   "y": 300,
   "type": "npc"
  },
  {
   "x": 550,
   "y": 150,
   "type": "exit"
  }
 ]
};
