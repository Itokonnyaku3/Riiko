/* 1面の 通れる／通れない を たしかめる（要件 P6：ソフトロックしない）
 * engine.js と おなじ ルール：しょうがいぶつ から (o.r + 18) 以上 はなれていれば 立てる
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.window = {};
// パーツの 絵の 一らん（Node には 画像が ないので 絵文字で えがかれる）
eval(fs.readFileSync(path.join(ROOT, "js/assets-data.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/assets.js"), "utf8"));
global.Assets = global.window.Assets;
eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
const M = global.window.MapData;
const data = global.window.MAPS["stage1"];
const built = M.build(data);

const PLAYER_R = 18;
const STEP = 6;
const W = data.world.width, H = data.world.height;
const NX = Math.floor(W / STEP), NY = Math.floor(H / STEP);

function buildGrid(extraObstacles) {
  const obs = built.obstacles.concat(extraObstacles || []);
  // 空間ハッシュ（速くするため）
  const CELL = 80;
  const buckets = new Map();
  for (const o of obs) {
    const reach = o.r + PLAYER_R;
    const x0 = Math.floor((o.x - reach) / CELL), x1 = Math.floor((o.x + reach) / CELL);
    const y0 = Math.floor((o.y - reach) / CELL), y1 = Math.floor((o.y + reach) / CELL);
    for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) {
      const k = bx + "," + by;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(o);
    }
  }
  const free = new Uint8Array(NX * NY);
  for (let ix = 0; ix < NX; ix++) {
    const px = ix * STEP;
    for (let iy = 0; iy < NY; iy++) {
      const py = iy * STEP;
      if (px < 20 || px > W - 20 || py < 20 || py > H - 20) continue; // engine の clamp
      const list = buckets.get(Math.floor(px / CELL) + "," + Math.floor(py / CELL));
      let ok = true;
      if (list) for (const o of list) {
        const dx = px - o.x, dy = py - o.y;
        if (dx * dx + dy * dy < (o.r + PLAYER_R) * (o.r + PLAYER_R)) { ok = false; break; }
      }
      if (ok) free[ix * NY + iy] = 1;
    }
  }
  return free;
}

function flood(free, sx, sy) {
  const seen = new Uint8Array(NX * NY);
  const si = Math.round(sx / STEP), sj = Math.round(sy / STEP);
  if (!free[si * NY + sj]) return { seen, ok: false };
  const q = [si * NY + sj];
  seen[si * NY + sj] = 1;
  while (q.length) {
    const cur = q.pop();
    const ix = Math.floor(cur / NY), iy = cur % NY;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = ix + dx, ny = iy + dy;
      if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
      const k = nx * NY + ny;
      if (seen[k] || !free[k]) continue;
      seen[k] = 1; q.push(k);
    }
  }
  return { seen, ok: true };
}
const at = (seen, x, y) => !!seen[Math.round(x / STEP) * NY + Math.round(y / STEP)];

const START = [1400, 4400];
const POINTS = {
  "スタート（村）":        [1400, 4400],
  "きこりの小屋":          [1400, 3720],
  "森の広場":              [1400, 3000],
  "右の寄り道（宝c2）":     [2080, 3000],
  "三叉路":                [1400, 2700],
  "左の行き止まり（宝c1）": [510, 2530],
  "右の行き止まり（うさぎ）":[2300, 2530],
  "岩の手前の広場":         [1400, 2420],
  "★岩の間（抜け道）":      [1400, 2200],
  "森の奥":                [1400, 1800],
  "見晴らしの高台":         [1420, 920],
  "出口":                  [1420, 660],
};

console.log("=== 1) ふつうに 遊んだとき ===");
const g1 = buildGrid();
const f1 = flood(g1, START[0], START[1]);
if (!f1.ok) { console.log("!! スタート地点に 立てない"); process.exit(1); }
let fail = 0;
for (const [name, p] of Object.entries(POINTS)) {
  const ok = at(f1.seen, p[0], p[1]);
  console.log((ok ? "  OK  " : "  NG  ") + name + "  (" + p + ")");
  if (!ok) fail++;
}

console.log("\n=== 2) 行けては いけない ところ ===");
const forbidden = {
  "やみのしろ（遠景）":   [1400, 320],
  "しろの手前":          [1400, 500],
  "森の中（左おく）":     [240, 1800],
  "森の中（右おく）":     [2600, 1800],
  "世界の北のはし":       [1400, 80],
};
for (const [name, p] of Object.entries(forbidden)) {
  const ok = at(f1.seen, p[0], p[1]);
  console.log((ok ? "  NG(行けてしまう) " : "  OK(行けない)     ") + name + "  (" + p + ")");
  if (ok) fail++;
}

console.log("\n=== 3) 抜け道を ふさぐと 先へ 進めないか（謎が 本物か）===");
const plug = [];
for (let y = 2080; y <= 2340; y += 40) plug.push({ x: 1400, y: y, r: 200, sprite: "X" });
const g2 = buildGrid(plug);
const f2 = flood(g2, START[0], START[1]);
const northReach = at(f2.seen, 1420, 920);
console.log((northReach ? "  NG " : "  OK ") + "抜け道を ふさぐと 高台へ 行けない（＝二つの岩の間が 唯一の 道）");
if (northReach) fail++;
const stillFork = at(f2.seen, 1400, 2700) && at(f2.seen, 510, 2530) && at(f2.seen, 2300, 2530);
console.log((stillFork ? "  OK " : "  NG ") + "ふさいでも 三叉路・左右の 行き止まりには 行ける");
if (!stillFork) fail++;

console.log("\n=== 4) 抜け道の ひろさ ===");
for (const y of [2380, 2300, 2200, 2100, 2000]) {
  let lo = null, hi = null;
  for (let x = 1120; x <= 1680; x += 2) {
    if (at(f1.seen, x, y)) { if (lo === null) lo = x; hi = x; }
  }
  console.log("  y=" + y + " → 通れる はば " + (lo === null ? "なし" : (hi - lo) + "px (x " + lo + "〜" + hi + ")"));
}

console.log("\n" + (fail === 0 ? "✅ ぜんぶ OK" : "❌ NG が " + fail + "件"));
process.exit(fail === 0 ? 0 : 1);
