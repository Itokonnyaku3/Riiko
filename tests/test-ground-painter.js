/* 自然な じめん（js/ground-painter.js）のテスト
 * 決まった結果・チャンクのつなぎめ・水とあわ・まっすぐな橋・速さ
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.window = {};
eval(fs.readFileSync(path.join(ROOT, "js/assets-data.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/assets.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage2.js"), "utf8"));
const GP = require(path.join(ROOT, "js/ground-painter.js"));
const M = global.window.MapData;

let fail = 0;
function check(name, ok, extra) {
  console.log((ok ? "OK   " : "FAIL ") + name + (extra ? "  " + extra : ""));
  if (!ok) fail++;
}
const GC = "#4e7a44";
const waterC = M.GROUND_KINDS.water.color, woodC = M.GROUND_KINDS.wood.color, sandC = M.GROUND_KINDS.sand.color;
const areas = [
  { shape: "circle", x: 300, y: 300, r: 200, kind: "water", color: waterC },
  { shape: "rect", x: 560, y: 100, w: 200, h: 60, kind: "wood", color: woodC },
  { shape: "path", points: [{ x: 50, y: 700 }, { x: 600, y: 650 }], width: 80, kind: "dirt", color: M.GROUND_KINDS.dirt.color },
  { shape: "rect", x: 1000, y: 1000, w: 400, h: 400, kind: "sand", color: sandC },
];
const P = (o) => GP.paintChunk(Object.assign({ areas, ground: GC, scale: 2, seed: 7 }, o));
const keyAt = (r, x, y) => r.kinds[r.labels[y * r.width + x]].key;
const shadeAt = (r, x, y) => { const o = (y * r.width + x) * 4; return [r.shade[o], r.shade[o + 1], r.shade[o + 2], r.shade[o + 3]]; };
const sameArr = (a, b) => a.every((v, i) => v === b[i]);

// 1. 決まった結果
{
  const a = P({ x: 0, y: 0, w: 400, h: 400 });
  const b = P({ x: 0, y: 0, w: 400, h: 400 });
  const c = P({ x: 0, y: 0, w: 400, h: 400, seed: 8 });
  check("size", a.width === 200 && a.height === 200 && a.labels.length === 40000 && a.shade.length === 160000);
  check("deterministic", Buffer.compare(Buffer.from(a.labels), Buffer.from(b.labels)) === 0 && Buffer.compare(Buffer.from(a.shade), Buffer.from(b.shade)) === 0);
  check("seed differs", Buffer.compare(Buffer.from(a.shade), Buffer.from(c.shade)) !== 0);
}

// 2. つなぎめ（400+400 と 800 を くらべる。ラベルは key で、かげは そのまま）
{
  const left = P({ x: 0, y: 200, w: 400, h: 400 });
  const right = P({ x: 400, y: 200, w: 400, h: 400 });
  const whole = P({ x: 0, y: 200, w: 800, h: 400 });
  let diff = 0;
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      if (keyAt(left, x, y) !== keyAt(whole, x, y) || !sameArr(shadeAt(left, x, y), shadeAt(whole, x, y))) diff++;
      if (keyAt(right, x, y) !== keyAt(whole, x + 200, y) || !sameArr(shadeAt(right, x, y), shadeAt(whole, x + 200, y))) diff++;
    }
  }
  check("chunk seams identical (labels + shade)", diff === 0, "diff=" + diff);
}

// 3. 水とあわ
{
  const r = P({ areas: [areas[0]], x: 0, y: 0, w: 600, h: 600 });
  let water = 0, total = 0, foam = 0, wobble = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const d = Math.hypot(x * 2 - 300, y * 2 - 300);
    const isW = r.kinds[r.labels[y * r.width + x]].kind === "water";
    if (d < 150) { total++; if (isW) water++; }
    if (d > 150 && d < 250 && isW !== (d < 200)) wobble++;
    if (isW && d > 170 && d < 205 && shadeAt(r, x, y)[3] > 150 && shadeAt(r, x, y)[0] > 200) foam++;
  }
  check("water interior is water", water / total > 0.99, (water / total).toFixed(3));
  check("edge is wobbly (not a perfect circle)", wobble > 200, "wobble=" + wobble);
  check("shoreline foam", foam > 100, "foam=" + foam);
  check("ground outside is ground", r.kinds[r.labels[2 * r.width + 2]].isGround);
}

// 4. 橋は まっすぐ
{
  const r = P({ areas: [areas[1]], x: 500, y: 60, w: 320, h: 140 });
  const isWood = (x, y) => r.kinds[r.labels[y * r.width + x]].kind === "wood";
  let bad = 0, n = 0;
  for (let wy = 100; wy < 160; wy += 2) {
    for (const wx of [556, 558, 760, 762]) { n++; if (isWood((wx - 500) / 2, (wy - 60) / 2)) bad++; }
    for (const wx of [562, 564, 754, 756]) { n++; if (!isWood((wx - 500) / 2, (wy - 60) / 2)) bad++; }
  }
  for (let wx = 570; wx < 750; wx += 2) {
    n += 2;
    if (isWood((wx - 500) / 2, (98 - 60) / 2)) bad++;
    if (isWood((wx - 500) / 2, (162 - 60) / 2)) bad++;
  }
  check("wood bridge edges straight", bad === 0, "bad=" + bad + "/" + n);
}

// 5. かどが まるい（400x400 の すな）
{
  const r = P({ areas: [areas[3]], x: 960, y: 960, w: 500, h: 500 });
  const at = (wx, wy) => r.kinds[r.labels[Math.floor((wy - 960) / 2) * r.width + Math.floor((wx - 960) / 2)]].kind;
  let cornersRounded = 0;
  for (const [cx, cy] of [[1006, 1006], [1394 - 0, 1006], [1006, 1394], [1394, 1394]]) if (at(cx, cy) !== "sand") cornersRounded++;
  check("rect centre is sand", at(1200, 1200) === "sand");
  check("rect corner (x+6,y+6) is not sand", at(1006, 1006) !== "sand");
  check("rounded corners (>=3 of 4)", cornersRounded >= 3, cornersRounded + "/4");
  check("straight edge middle is sand", at(1200, 1012) === "sand" || at(1200, 1030) === "sand");
}

// 6. 速さ（2面のデータ）
{
  const built = M.build(global.window.MAPS["stage2"]);
  const ar = built.world.areas;
  const times = [];
  let r;
  for (const [cx, cy] of [[0, 0], [800, 800], [1000, 2400], [1000, 2800], [400, 1600]]) {
    const t0 = process.hrtime.bigint();
    r = GP.paintChunk({ areas: ar, ground: built.world.ground, x: cx, y: cy, w: 800, h: 800, scale: 2, seed: 1 });
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  console.log("stage2 800x800 chunk ms: " + times.map((t) => t.toFixed(1)).join(", "));
  check("timing (median < 150ms)", times.slice().sort((a, b) => a - b)[2] < 150);
  check("kinds listed", r.kinds.length >= 2 && r.kinds[0].isGround && r.width === 400);
}

console.log(fail ? "FAILED: " + fail : "ALL PASSED");
if (fail) process.exit(1);
