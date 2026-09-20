// マップエディタ旧版の「小さな円の連続」を、同じ見た目の滑らかな path にまとめる。
// 使い方: node tools/compact-map-paths.js js/maps/stage1.js [--write]
const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const write = process.argv.includes("--write");
if (!input) throw new Error("対象の js/maps/*.js を指定してください");

const root = path.resolve(__dirname, "..");
const file = path.resolve(root, input);
const mapsDir = path.resolve(root, "js", "maps") + path.sep;
if (!file.startsWith(mapsDir) || path.extname(file) !== ".js") {
  throw new Error("js/maps/*.js だけを対象にできます");
}

const source = fs.readFileSync(file, "utf8");
const match = source.match(/\/\*MAPDATA\*\/([\s\S]*?)\/\*ENDMAPDATA\*\//);
if (!match) throw new Error("MAPDATA ブロックが見つかりません");
const data = JSON.parse(match[1].trim().replace(/;$/, ""));

function pointSegmentDistance(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let max = 0, index = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointSegmentDistance(points[i], points[0], points[points.length - 1]);
    if (d > max) { max = d; index = i; }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

function compatible(a, b) {
  return a && b && a.shape === "circle" && b.shape === "circle" &&
    a.r <= 24 && a.r === b.r && a.kind === b.kind &&
    a.passable === b.passable && a.color === b.color &&
    Math.hypot(a.x - b.x, a.y - b.y) <= a.r * 2.2;
}

const compacted = [];
let convertedCircles = 0;
let createdPaths = 0;
for (let i = 0; i < data.areas.length;) {
  const first = data.areas[i];
  if (first.shape !== "circle" || first.r > 24) {
    compacted.push(first);
    i++;
    continue;
  }
  const run = [first];
  let j = i + 1;
  while (j < data.areas.length && compatible(data.areas[j - 1], data.areas[j])) run.push(data.areas[j++]);
  if (run.length >= 4) {
    const area = {
      shape: "path",
      points: simplify(run.map((a) => ({ x: a.x, y: a.y })), Math.max(2, first.r * 0.18)),
      width: first.r * 2,
      kind: first.kind,
    };
    if (first.passable != null) area.passable = first.passable;
    if (first.color != null) area.color = first.color;
    compacted.push(area);
    convertedCircles += run.length;
    createdPaths++;
  } else {
    compacted.push(...run);
  }
  i = j;
}

const before = data.areas.length;
data.areas = compacted;
const json = JSON.stringify(data, null, 1);
const output = source.slice(0, match.index) + "/*MAPDATA*/" + json + "/*ENDMAPDATA*/" + source.slice(match.index + match[0].length);

console.log(JSON.stringify({ file: path.relative(root, file), before, after: compacted.length, convertedCircles, createdPaths, write }, null, 2));
if (write) fs.writeFileSync(file, output, "utf8");
