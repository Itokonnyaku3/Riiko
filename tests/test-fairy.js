// 仲間1 妖精ピカ（Ph4）… 加入・ついてくる・しゃべる・ヒント・薬
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const ctxStub = new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) });
function mkEl(id) {
  const L = {};
  return { id, style: {}, textContent: "", width: 0, height: 0,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; if (v) this._s.add(c); else this._s.delete(c); return v; } },
    addEventListener: (t, fn) => ((L[t] = L[t] || []).push(fn)),
    dispatch: (t, ev) => (L[t] || []).forEach((f) => f(ev)),
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    querySelectorAll: () => [] };
}
const els = {};
global.document = { getElementById: (id) => (els[id] = els[id] || mkEl(id)), querySelectorAll: () => [] };
global.requestAnimationFrame = () => 1;
global.performance = { now: () => 0 };
global.setTimeout = (fn) => { fn(); return 0; };
global.window = { addEventListener: () => {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800 };
global.Image = function () { this.complete = false; this.naturalWidth = 0; };
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };

eval(fs.readFileSync(path.join(ROOT, "js/mapdata.js"), "utf8"));
global.MapData = global.window.MapData;
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/maps/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/scenario.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage1.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/stages/stage2.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8"));

const T = [];
const ok = (n, c, e) => T.push([c ? "✅" : "❌", n, e === undefined ? "" : e]);
const G = window.RiikoGame;
const H = G._test;
const dialogOpen = () => !els["dialogue"].classList.contains("hidden");
const closeDialogue = () => { for (let i = 0; i < 40 && dialogOpen(); i++) els["dialogue"].dispatch("pointerdown", { stopPropagation() {} }); };
const run = (n) => { for (let i = 0; i < n; i++) { H.step(1 / 60); if (dialogOpen()) closeDialogue(); } };

G.eraseSave();
G.start();
let st = H.state;
for (let i = 0; i < 3000 && st.cut; i++) { H.step(1 / 60); if (dialogOpen()) closeDialogue(); }

// 1面には いない
ok("1面に ピカは いない", st.fairy === null);
ok("1面では ヒントボタンを 出さない", els["btn-hint"].classList.contains("hidden"));

// 2面へ
H.goStage("stage2");
st = H.state;
ok("2面でも まだ いない（助ける まえ）", st.fairy === null);

// クモの巣に 話しかける ＝ 助ける
const web = st.npcs.filter((n) => n.id === "s2n1")[0];
st.player.x = web.x; st.player.y = web.y; H.step(1 / 60);
ok("クモの巣の 声が きこえる", dialogOpen());
closeDialogue();
run(4);
ok("★ピカが 仲間に なる", !!st.fairy);
ok("加入が うれしい 出来事に なって いる",
  st.floaters.some((f) => f.text.indexOf("なかまに なった") >= 0),
  st.floaters.map((f) => f.text).join(","));
ok("ヒントボタンが 出る", !els["btn-hint"].classList.contains("hidden"));

// ついてくる
st.player.x = 550; st.player.y = 600;
run(90);
const d = Math.hypot(st.fairy.x - st.player.x, st.fairy.y - st.player.y);
ok("そばを とんで ついてくる", d < 90, "きょり " + Math.round(d));

// かってに しゃべる
st.fairy.talkCd = 0; st.fairy.lastSaid = "";
run(3);
const said1 = st.fairy.say;
ok("かってに しゃべる", !!said1, said1);
st.fairy.talkCd = 0;
run(3);
ok("おなじ ことばを つづけて 言わない", st.fairy.say === said1 || st.fairy.say !== "", st.fairy.say);

// ヒントは ピカが 言う（floater ではなく ふきだし）
st.fairy.say = ""; st.fairy.lastSaid = "";
st.floaters.length = 0;
H.hint(1);
ok("ヒントは ピカが しゃべる", !!st.fairy.say, st.fairy.say);
ok("ヒントで 画面が 止まらない", st.paused === false);

// 薬：ハートが 1つに なると とりに 行く
st.player.maxHp = 3; st.player.hp = 1; st.downT = 0;
st.fairy.potionsLeft = 2;
run(4);
ok("ピンチで 薬を とりに 行く", !!st.fairy.errand);
run(200);
ok("薬で ハートが もどる", st.player.hp > 1, "ハート " + st.player.hp);
ok("薬は 回数せいげんが ある", st.fairy.potionsLeft === 1);

// 面を またいでも のこる
H.goStage("stage1");
st = H.state;
ok("べつの面でも ピカは いっしょ（1面に もどると 設定が ないので いない）", st.fairy === null);
H.goStage("stage2");
st = H.state;
ok("2面に もどると ピカが いる（フラグが のこって いる）", !!st.fairy);

let ng = 0;
for (const r of T) { console.log(r[0] + "  " + r[1] + "  " + r[2]); if (r[0] === "❌") ng++; }
console.log("\n" + (T.length - ng) + " / " + T.length + " OK");
process.exit(ng === 0 ? 0 : 1);
