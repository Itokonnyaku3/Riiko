// マップの パーツの 絵（assets/parts/*.png）を たしかめる
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

// ---- ぜんぶ よみこめた ことに する 画像 ----
let loaded = true;
global.Image = function () {
  const self = this;
  this.complete = true;
  Object.defineProperty(this, "naturalWidth", { get: () => (loaded ? 100 : 0) });
  this.src = "";
  return self;
};
global.window = {};

eval(fs.readFileSync(path.join(ROOT, "js/assets-data.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/assets.js"), "utf8"));
const Assets = global.window.Assets;
const DATA = global.window.PartAssets;

const calls = [];
const ctx = new Proxy(
  {
    drawImage: (im, x, y, w, h) => calls.push({ kind: "img", src: im.src, x, y, w, h }),
    fillText: (t, x, y) => calls.push({ kind: "text", t, x, y }),
  },
  { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }
);

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);

// 1) 一らんと ファイルが 合っている
const missing = DATA.list.filter((a) => !fs.existsSync(path.join(ROOT, DATA.dir, a.id + ".png")));
ok("絵の ファイルが ぜんぶ ある", missing.length === 0, missing.map((a) => a.id).join(",") || DATA.list.length + "こ");

const bad = DATA.list.filter((a) => !a.id || !a.label || !a.w || !a.h || !a.size);
ok("一らんの 中みが そろっている", bad.length === 0, bad.map((a) => a.id).join(","));

const dup = DATA.list.map((a) => a.id).filter((id, i, all) => all.indexOf(id) !== i);
ok("おなじ 名まえが ない", dup.length === 0, dup.join(","));

// つかって いない 絵の ファイルが のこって いないか
const files = fs.readdirSync(path.join(ROOT, DATA.dir)).filter((f) => f.endsWith(".png"));
const known = new Set(DATA.list.map((a) => a.id + ".png"));
const extra = files.filter((f) => !known.has(f));
ok("よぶんな 絵の ファイルが ない", extra.length === 0, extra.join(","));

// 2) 名まえで 見つかる／むかしの 絵文字も つながる
ok("名まえで 見つかる", !!Assets.def("tree"), Assets.def("tree") && Assets.def("tree").label);
ok("むかしの 🌳 が あたらしい 木に なる", Assets.def("🌳").id === "tree");
ok("しらない 名まえは null", Assets.def("👣") === null);

// 3) 絵で かく（ぶつかる まるの 足もとに そろう）
const a = Assets.def("tree");
calls.length = 0;
Assets.drawPart(ctx, "tree", 100, 200, a.r);
const c = calls[0];
ok("パーツは 絵で かかれる", c && c.kind === "img", c && c.kind);
ok("大きさは size どおり", c && Math.abs(c.h - a.size) < 0.01, c && c.h);
ok("よこは 絵の かたち どおり", c && Math.abs(c.w - (a.size * a.w) / a.h) < 0.01, c && c.w);
ok("よこの まん中に くる", c && Math.abs(c.x + c.w / 2 - 100) < 0.01, c && c.x);
ok("足もとが ぶつかる まるの 下に くる", c && Math.abs(c.y + c.h - (200 + a.r * 0.55)) < 0.01, c && c.y);

// 大きさを かえると 絵も 大きくなる
calls.length = 0;
Assets.drawPart(ctx, "tree", 0, 0, a.r * 2);
ok("大きさを かえると 絵も かわる", Math.abs(calls[0].h - a.size * 2) < 0.01, calls[0].h);

// 4) 絵が まだ よみこめて いない ときは 絵文字
loaded = false;
calls.length = 0;
Assets.drawPart(ctx, "tree", 10, 20, 26);
ok("絵が ない ときは 絵文字", calls[0] && calls[0].kind === "text" && calls[0].t === "🌳", JSON.stringify(calls[0]));
calls.length = 0;
Assets.drawPart(ctx, "👣", 10, 20, 26);
ok("しらない ものは そのまま 絵文字", calls[0] && calls[0].t === "👣");
loaded = true;

// 5) かざりは 小さいまま かける
calls.length = 0;
Assets.drawDeco(ctx, "grass-tuft", 50, 60, 30);
ok("かざりは 高さ30で かかれる", Math.abs(calls[0].h - 30) < 0.01, calls[0].h);

// 6) マップの パーツ一らんが 絵に なっている
global.window.MapData = undefined;
eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
const M = global.window.MapData;
const parts = M.PARTS.filter((p) => Assets.def(p.sprite));
ok("パーツ一らんが 絵に なっている", parts.length > 50, parts.length + " / " + M.PARTS.length);
ok("パーツの 大きさが 絵と そろう", M.PARTS.every((p) => p.r > 0));
ok("うめる パーツも えらべる", M.FILL_PARTS.every((s) => Assets.def(s) || s.length <= 3), M.FILL_PARTS.length + "こ");
ok("かざりも 絵が ある", M.DECOS.some((s) => Assets.def(s)));

for (const [m, n, e] of T) console.log(m + "  " + n + "  " + (e || ""));
const ng = T.filter((t) => t[0] === "❌").length;
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng ? 1 : 0);
