/*
 * =========================================================
 *  ground-painter.js : じめんの「ラベル」と「かげ」を 作る（DOMなし・純粋な計算）
 * =========================================================
 *  GroundPainter.paintChunk({ areas, ground, x, y, w, h, scale, seed })
 *    -> { width, height,
 *         kinds:  [{ key, kind, color, isGround, count }],   // 領域（kind+色）の 一らん
 *         labels: Uint8Array(width*height),                   // kinds の 番号
 *         shade:  Uint8ClampedArray(RGBA) }                   // 上に かさねる 色（うすい）
 *
 *  ・領域は「あらい格子の ラベル」を ぼかして 多数決（ワープ + ノイズで ゆらす）で きめる。
 *    かどが まるく、ふちが しぜんに うねる。同じ kind の 重なりは つなぎめなく つながる。
 *  ・板（wood）は 厳密に まっすぐ。
 *  ・ワールド座標だけで きまるので、となりの チャンクと つなぎめが そろう（x,y は 4の倍数）。
 *  ・実際の テクスチャは engine.js が Assets.getGroundPattern で ぬる。
 *  ・あたりはんてい（MapData.terrainAt / isPassable）には いっさい さわらない。見た目だけ。
 * =========================================================
 */
(function () {
  "use strict";

  const MARGIN_CELLS = 10; // 距離計算用の よゆう（出力ピクセル数）
  const DIST_CAP = 30; // chamfer 3-4 の 上限（= 10セル）
  const COARSE = 4; // あらい格子の 1マス（ワールドpx）
  const COARSE_MARGIN = 40; // あらい格子の よゆう（マス数 = 128px）
  const BLUR_R = 7; // 投票のぼかし半径（あらいマス = 24px）
  const WARP_AMP = 40; // ふちを ゆらす 大きさ（ワールドpx）
  const WARP_WL = 170;
  const BIAS_AMP = 0.18;
  const BIAS_WL = 55;
  const JITTER = 0.04;
  const TILE = 16; // 候補リストを 作る タイル（出力セル数）
  const AREA_PAD = 220;

  // ---- ハッシュ・ノイズ ----
  function hash2(ix, iy, seed) {
    let h = (Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ Math.imul((seed | 0) + 0x9e3779b9, 0x85ebca6b)) | 0;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  // なめらかな バリューノイズ（0..1）。wl = 1めの 大きさ（ワールドpx）
  function noise(x, y, wl, seed) {
    const fx = x / wl, fy = y / wl;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
    const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  function fbm(x, y, wl, seed, oct) {
    let sum = 0, amp = 1, norm = 0, w = wl;
    for (let o = 0; o < oct; o++) {
      sum += amp * noise(x + o * 17.3, y - o * 9.1, w, seed + o * 101);
      norm += amp;
      amp *= 0.5;
      w *= 0.5;
    }
    return sum / norm;
  }

  function signedFbm(x, y, wl, seed, oct) {
    return (fbm(x, y, wl, seed, oct) - 0.5) * 2;
  }

  const KIND_COLORS = {
    grass: "#8fca7a", grass2: "#79b768", dirt: "#c9a878", sand: "#e7d7a4", stone: "#b9b7bf",
    stone2: "#8d8a96", wood: "#c08a52", carpet: "#b4535a", snow: "#e9f1f7", lava: "#d5763f", water: "#4da6ff",
  };
  const K = { ground: 0, grass: 1, path: 2, water: 3, wood: 4, other: 5 };
  function kindClass(kind) {
    switch (kind) {
      case "grass": case "grass2": return K.grass;
      case "dirt": case "sand": case "stone": case "stone2": return K.path;
      case "water": return K.water;
      case "wood": return K.wood;
      default: return K.other;
    }
  }
  function areaColor(a) { return a.color || KIND_COLORS[a.kind] || "#8fca7a"; }

  function strHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) + str.charCodeAt(i)) | 0;
    return h;
  }

  function areaBounds(a) {
    if (a.shape === "circle") return [a.x - a.r, a.y - a.r, a.x + a.r, a.y + a.r];
    if (a.shape === "path") {
      const pts = a.points || [];
      if (!pts.length) return [0, 0, -1, -1];
      let x0 = pts[0].x, x1 = x0, y0 = pts[0].y, y1 = y0;
      for (const p of pts) {
        if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
        if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      }
      const r = (a.width || 0) / 2;
      return [x0 - r, y0 - r, x1 + r, y1 + r];
    }
    return [a.x, a.y, a.x + a.w, a.y + a.h];
  }

  // 重ね塗り用の 作業変数（アロケーションを さける）
  let ar = 0, ag = 0, ab = 0, aa = 0;
  function over(cr, cg, cb, ca) {
    if (ca <= 0) return;
    const na = ca + aa * (1 - ca);
    ar = (cr * ca + ar * aa * (1 - ca)) / na;
    ag = (cg * ca + ag * aa * (1 - ca)) / na;
    ab = (cb * ca + ab * aa * (1 - ca)) / na;
    aa = na;
  }

  function paintChunk(opts) {
    const scale = opts.scale || 2;
    const cx0 = opts.x, cy0 = opts.y;
    const W = Math.ceil(opts.w / scale), H = Math.ceil(opts.h / scale);
    const seed = (opts.seed | 0) || 1;
    const M = MARGIN_CELLS;
    const GW = W + M * 2, GH = H + M * 2;

    // ---- 領域の 表 ----
    const regionIds = {};
    const regions = []; // {key, kind, color, isGround, cls, seed, count}
    function regionOf(kind, color) {
      const key = kind + "|" + color;
      let id = regionIds[key];
      if (id === undefined) {
        id = regions.length;
        regionIds[key] = id;
        regions.push({ key, kind, color, isGround: kind === "ground", cls: kind === "ground" ? K.ground : kindClass(kind), seed: strHash(key) + seed, count: 0 });
      }
      return id;
    }
    const groundRegion = regionOf("ground", opts.ground || "#4e7a44");

    // ---- あらい格子（COARSE px）----
    const gx0 = Math.floor((cx0 - M * scale) / COARSE) - COARSE_MARGIN;
    const gy0 = Math.floor((cy0 - M * scale) / COARSE) - COARSE_MARGIN;
    const CW = Math.ceil((W + M * 2) * scale / COARSE) + COARSE_MARGIN * 2 + 2;
    const CH = Math.ceil((H + M * 2) * scale / COARSE) + COARSE_MARGIN * 2 + 2;
    const rx0 = gx0 * COARSE, ry0 = gy0 * COARSE, rx1 = (gx0 + CW) * COARSE, ry1 = (gy0 + CH) * COARSE;

    // このチャンクに かかる エリア
    const L = [], woodAreas = [];
    const src = opts.areas || [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const b = areaBounds(a);
      if (b[2] < rx0 - AREA_PAD || b[0] > rx1 + AREA_PAD || b[3] < ry0 - AREA_PAD || b[1] > ry1 + AREA_PAD) continue;
      const region = regionOf(a.kind, areaColor(a));
      const e = { a, b, region, typ: a.shape === "circle" ? 0 : a.shape === "path" ? 2 : 1 };
      L.push(e);
      if (a.kind === "wood") woodAreas.push(e);
    }
    const n = L.length;
    const bx0 = new Float64Array(n), by0 = new Float64Array(n), bx1 = new Float64Array(n), by1 = new Float64Array(n);
    for (let i = 0; i < n; i++) { bx0[i] = L[i].b[0]; by0[i] = L[i].b[1]; bx1[i] = L[i].b[2]; by1[i] = L[i].b[3]; }

    function hitTest(e, px, py) {
      const a = e.a;
      if (e.typ === 0) { const dx = px - a.x, dy = py - a.y; return dx * dx + dy * dy < a.r * a.r; }
      if (e.typ === 1) return px > a.x && px < a.x + a.w && py > a.y && py < a.y + a.h;
      const pts = a.points || [];
      const hw = (a.width || 0) * 0.5, hw2 = hw * hw;
      if (pts.length === 1) { const dx = px - pts[0].x, dy = py - pts[0].y; return dx * dx + dy * dy < hw2; }
      for (let j = 1; j < pts.length; j++) {
        const p0 = pts[j - 1], p1 = pts[j];
        const vx = p1.x - p0.x, vy = p1.y - p0.y;
        const len2 = vx * vx + vy * vy;
        let t = len2 ? ((px - p0.x) * vx + (py - p0.y) * vy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - (p0.x + vx * t), dy = py - (p0.y + vy * t);
        if (dx * dx + dy * dy < hw2) return true;
      }
      return false;
    }
    // 一番上の エリアの 領域番号（なければ ground）
    function strictRegion(px, py) {
      for (let i = n - 1; i >= 0; i--) {
        if (px < bx0[i] || px > bx1[i] || py < by0[i] || py > by1[i]) continue;
        if (hitTest(L[i], px, py)) return L[i].region;
      }
      return groundRegion;
    }
    function woodRegionAt(px, py) {
      // 板が 一番上に あるときだけ 板（上に ほかの エリアが かさなれば 板ではない）
      for (let i = n - 1; i >= 0; i--) {
        if (px < bx0[i] || px > bx1[i] || py < by0[i] || py > by1[i]) continue;
        if (hitTest(L[i], px, py)) return L[i].a.kind === "wood" ? L[i].region : -1;
      }
      return -1;
    }

    const K_N = regions.length;
    const coarse = new Uint8Array(CW * CH);
    for (let j = 0; j < CH; j++) {
      const wy = (gy0 + j + 0.5) * COARSE;
      for (let i = 0; i < CW; i++) coarse[j * CW + i] = strictRegion((gx0 + i + 0.5) * COARSE, wy);
    }

    // 領域ごとの 積分画像
    const SW = CW + 1;
    const sats = [];
    for (let k = 0; k < K_N; k++) {
      const sat = new Int32Array(SW * (CH + 1));
      for (let j = 0; j < CH; j++) {
        let row = 0;
        for (let i = 0; i < CW; i++) {
          if (coarse[j * CW + i] === k) row++;
          sat[(j + 1) * SW + i + 1] = sat[j * SW + i + 1] + row;
        }
      }
      sats.push(sat);
    }
    const boxArea = (2 * BLUR_R + 1) * (2 * BLUR_R + 1);
    function boxCount(sat, ci, cj, r) {
      let i0 = ci - r, i1 = ci + r + 1, j0 = cj - r, j1 = cj + r + 1;
      if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0;
      if (i1 > CW) i1 = CW; if (j1 > CH) j1 = CH;
      if (i1 <= i0 || j1 <= j0) return 0;
      return sat[j1 * SW + i1] - sat[j0 * SW + i1] - sat[j1 * SW + i0] + sat[j0 * SW + i0];
    }

    // タイルごとの 候補領域（ビットマスク。板は 投票に 出さない）
    const useMask = K_N <= 32;
    let voteMask = 0;
    for (let k = 0; k < K_N; k++) if (regions[k].cls !== K.wood) voteMask |= (1 << k);
    const gI0 = Math.floor(cx0 / scale) - M, gJ0 = Math.floor(cy0 / scale) - M; // 格子左上の 通し番号
    const tI0 = Math.floor(gI0 / TILE), tJ0 = Math.floor(gJ0 / TILE);
    const TWn = Math.floor((gI0 + GW - 1) / TILE) - tI0 + 1, THn = Math.floor((gJ0 + GH - 1) / TILE) - tJ0 + 1;
    const tileMask = new Int32Array(TWn * THn);
    const ext = BLUR_R * COARSE + WARP_AMP + 4;
    for (let tj = 0; tj < THn; tj++) {
      for (let ti = 0; ti < TWn; ti++) {
        const wx0 = (tI0 + ti) * TILE * scale - ext, wx1 = (tI0 + ti + 1) * TILE * scale + ext;
        const wy0 = (tJ0 + tj) * TILE * scale - ext, wy1 = (tJ0 + tj + 1) * TILE * scale + ext;
        let i0 = Math.floor(wx0 / COARSE) - gx0, i1 = Math.floor(wx1 / COARSE) - gx0 + 1;
        let j0 = Math.floor(wy0 / COARSE) - gy0, j1 = Math.floor(wy1 / COARSE) - gy0 + 1;
        if (i0 < 0) i0 = 0; if (j0 < 0) j0 = 0; if (i1 > CW) i1 = CW; if (j1 > CH) j1 = CH;
        let m = 0;
        if (useMask) {
          for (let k = 0; k < K_N; k++) {
            if (!(voteMask & (1 << k))) continue;
            const sat = sats[k];
            if (sat[j1 * SW + i1] - sat[j0 * SW + i1] - sat[j1 * SW + i0] + sat[j0 * SW + i0] > 0) m |= (1 << k);
          }
        }
        tileMask[tj * TWn + ti] = m;
      }
    }

    // ---- ワープの 格子（WS セルおき・ワールド座標に そろえる）----
    const sA = seed * 7 + 11, sB = seed * 13 + 29;
    const WS = 4;
    const lgI = Math.floor(gI0 / WS), lgJ = Math.floor(gJ0 / WS);
    const LW = Math.ceil(GW / WS) + 2, LH = Math.ceil(GH / WS) + 2;
    const latX = new Float64Array(LW * LH), latY = new Float64Array(LW * LH);
    for (let j = 0; j < LH; j++) {
      const wy = (lgJ + j) * WS * scale;
      for (let i = 0; i < LW; i++) {
        const wx = (lgI + i) * WS * scale;
        latX[j * LW + i] = WARP_AMP * signedFbm(wx, wy, WARP_WL, sA, 3);
        latY[j * LW + i] = WARP_AMP * signedFbm(wx, wy, WARP_WL, sB, 3);
      }
    }
    const wstep = WS * scale;
    // うすい 明暗ノイズも なめらかなので おなじ 格子で 補間する
    const sT = seed * 3 + 41, sP = seed * 5 + 43;
    const latT = new Float64Array(LW * LH), latP = new Float64Array(LW * LH);
    for (let j = 0; j < LH; j++) {
      const wy = (lgJ + j) * WS * scale;
      for (let i = 0; i < LW; i++) {
        const wx = (lgI + i) * WS * scale;
        latT[j * LW + i] = (fbm(wx, wy, 160, sT, 3) - 0.5) * 3.2;
        latP[j * LW + i] = (fbm(wx, wy, 300, sP, 3) - 0.5) * 3.2;
      }
    }

    // ---- ラベル（出力解像度 + よゆう）----
    const lab = new Uint8Array(GW * GH);
    const cand = new Int32Array(K_N);
    for (let j = 0; j < GH; j++) {
      const gj = gJ0 + j;
      const wy = (gj + 0.5) * scale;
      const fy = wy / wstep - lgJ, jy = Math.floor(fy), ty = fy - jy;
      for (let i = 0; i < GW; i++) {
        const gi = gI0 + i;
        const wx = (gi + 0.5) * scale;
        const k0 = j * GW + i;
        if (woodAreas.length) {
          const wr = woodRegionAt(wx, wy);
          if (wr >= 0) { lab[k0] = wr; continue; }
        }
        const fx = wx / wstep - lgI, jx = Math.floor(fx), tx = fx - jx;
        const l0 = jy * LW + jx, l1 = l0 + LW;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const sx = wx + latX[l0] * w00 + latX[l0 + 1] * w10 + latX[l1] * w01 + latX[l1 + 1] * w11;
        const sy = wy + latY[l0] * w00 + latY[l0 + 1] * w10 + latY[l1] * w01 + latY[l1 + 1] * w11;
        const ci = Math.floor(sx / COARSE) - gx0, cj = Math.floor(sy / COARSE) - gy0;
        const mask = useMask ? tileMask[(Math.floor(gj / TILE) - tJ0) * TWn + (Math.floor(gi / TILE) - tI0)] : voteMask;
        let nc = 0, only = -1;
        for (let k = 0; k < K_N; k++) if (mask & (1 << k)) { only = k; cand[nc++] = k; }
        if (nc === 0) { lab[k0] = strictRegion(wx, wy); continue; }
        if (nc === 1) { lab[k0] = only; continue; }
        let best = -1, bestScore = -1;
        for (let c = 0; c < nc; c++) {
          const k = cand[c], r = regions[k];
          const sc = boxCount(sats[k], ci, cj, BLUR_R) / boxArea
            + BIAS_AMP * signedFbm(wx, wy, BIAS_WL, r.seed, 2)
            + JITTER * hash2(gi, gj, r.seed);
          if (sc > bestScore) { bestScore = sc; best = k; }
        }
        lab[k0] = best;
      }
    }

    // ---- ちがうラベルまでの きょり（chamfer 3-4）と となりの ラベル ----
    const dist = new Uint8Array(GW * GH);
    const nearReg = new Uint8Array(GW * GH);
    dist.fill(255);
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const k = j * GW + i, r = lab[k];
        let o = -1;
        if (i > 0 && lab[k - 1] !== r) o = lab[k - 1];
        else if (i < GW - 1 && lab[k + 1] !== r) o = lab[k + 1];
        else if (j > 0 && lab[k - GW] !== r) o = lab[k - GW];
        else if (j < GH - 1 && lab[k + GW] !== r) o = lab[k + GW];
        if (o >= 0) { dist[k] = 3; nearReg[k] = o; }
      }
    }
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const k = j * GW + i;
        let d = dist[k], nr = nearReg[k];
        if (i > 0 && dist[k - 1] + 3 < d) { d = dist[k - 1] + 3; nr = nearReg[k - 1]; }
        if (j > 0) {
          if (dist[k - GW] + 3 < d) { d = dist[k - GW] + 3; nr = nearReg[k - GW]; }
          if (i > 0 && dist[k - GW - 1] + 4 < d) { d = dist[k - GW - 1] + 4; nr = nearReg[k - GW - 1]; }
          if (i < GW - 1 && dist[k - GW + 1] + 4 < d) { d = dist[k - GW + 1] + 4; nr = nearReg[k - GW + 1]; }
        }
        dist[k] = d > DIST_CAP ? DIST_CAP : d; nearReg[k] = nr;
      }
    }
    for (let j = GH - 1; j >= 0; j--) {
      for (let i = GW - 1; i >= 0; i--) {
        const k = j * GW + i;
        let d = dist[k], nr = nearReg[k];
        if (i < GW - 1 && dist[k + 1] + 3 < d) { d = dist[k + 1] + 3; nr = nearReg[k + 1]; }
        if (j < GH - 1) {
          if (dist[k + GW] + 3 < d) { d = dist[k + GW] + 3; nr = nearReg[k + GW]; }
          if (i < GW - 1 && dist[k + GW + 1] + 4 < d) { d = dist[k + GW + 1] + 4; nr = nearReg[k + GW + 1]; }
          if (i > 0 && dist[k + GW - 1] + 4 < d) { d = dist[k + GW - 1] + 4; nr = nearReg[k + GW - 1]; }
        }
        dist[k] = d > DIST_CAP ? DIST_CAP : d; nearReg[k] = nr;
      }
    }

    // ---- 出力: ラベルと かげ ----
    const labels = new Uint8Array(W * H);
    const shade = new Uint8ClampedArray(W * H * 4);
    const sF = seed * 29 + 53, sR = seed * 31 + 59;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    for (let j = 0; j < H; j++) {
      const gj = gJ0 + M + j;
      const wy = (gj + 0.5) * scale;
      for (let i = 0; i < W; i++) {
        const gi = gI0 + M + i;
        const wx = (gi + 0.5) * scale;
        const k = (j + M) * GW + (i + M);
        const rid = lab[k];
        const rg = regions[rid];
        const cls = rg.cls;
        const d = dist[k];
        const near = d < DIST_CAP ? regions[nearReg[k]] : null;
        rg.count++;
        labels[j * W + i] = rid;
        ar = 0; ag = 0; ab = 0; aa = 0;

        // ぜんたいの うすい 明暗
        const fx = wx / wstep - lgI, jx = Math.floor(fx), tx = fx - jx;
        const fy = wy / wstep - lgJ, jy = Math.floor(fy), ty = fy - jy;
        const l0 = jy * LW + jx, l1 = l0 + LW;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const tv = latT[l0] * w00 + latT[l0 + 1] * w10 + latT[l1] * w01 + latT[l1 + 1] * w11;
        if (tv > 0) over(255, 255, 255, 0.10 * (tv > 1 ? 1 : tv));
        else over(0, 0, 0, 0.10 * (tv < -1 ? 1 : -tv));
        if (cls === K.ground || cls === K.grass) {
          const pv = latP[l0] * w00 + latP[l0 + 1] * w10 + latP[l1] * w01 + latP[l1 + 1] * w11;
          if (pv > 0) over(235, 255, 190, 0.08 * (pv > 1 ? 1 : pv));
          else over(0, 24, 10, 0.08 * (pv < -1 ? 1 : -pv));
          if (near && near.cls === K.path && d <= 12) over(20, 14, 6, 0.12 * clamp01(1 - (d - 3) / 9));
        } else if (cls === K.path) {
          if (d <= 9) over(30, 20, 10, 0.22 * clamp01(1 - (d - 3) / 6));
        } else if (cls === K.water) {
          over(10, 40, 110, 0.35 * (d >= DIST_CAP ? 1 : d / DIST_CAP));
          if (d <= 3) over(255, 255, 255, hash2(gi, gj, sF) < 0.85 ? 0.7 : 0.35);
          else if (d <= 6) over(255, 255, 255, hash2(gi, gj, sR) < 0.6 ? 0.3 : 0.12);
        } else if (cls === K.wood) {
          if (d <= 3) over(30, 16, 6, 0.25);
        }
        const o = (j * W + i) * 4;
        shade[o] = ar; shade[o + 1] = ag; shade[o + 2] = ab; shade[o + 3] = aa * 255;
      }
    }
    return {
      width: W, height: H,
      kinds: regions.map((r) => ({ key: r.key, kind: r.kind, color: r.color, isGround: r.isGround, count: r.count })),
      labels, shade,
    };
  }

  const api = { paintChunk, hash2, noise, fbm, signedFbm, MARGIN_CELLS };
  if (typeof window !== "undefined") window.GroundPainter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
