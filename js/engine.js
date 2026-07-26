/*
 * =========================================================
 *  ゲームエンジン（うごく しくみ）
 * =========================================================
 *  ふつうは ここは さわらなくて大丈夫。
 *  おはなしを変えたいときは js/scenario.js を編集してください。
 * =========================================================
 */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ---- 画面サイズ（スマホ・タブレットにあわせる） ----
  let viewW = 0,
    viewH = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  // ---- ゲームの状態 ----
  const G = {
    running: false,
    paused: false, // かいわ中は true
    last: 0,
    cam: { x: 0, y: 0 },
    world: null,
    player: null,
    partner: null,
    enemies: [],
    chests: [],
    npcs: [],
    decorations: [],
    floaters: [], // ふわっと出る文字（ダメージなど）
    keys: {},
    move: { active: false, tx: 0, ty: 0 }, // 「ここへ歩く」目標
  };

  const ENTITY_R = 34; // タップ判定・当たり半径のめやす

  // ---- しょきか ----
  function setup(scenario) {
    G.world = scenario.world;
    G.decorations = (scenario.decorations || []).map((d) => ({ ...d }));

    G.player = {
      x: scenario.player.x,
      y: scenario.player.y,
      sprite: scenario.player.sprite,
      name: scenario.player.name,
      speed: 150,
    };

    G.partner = {
      x: scenario.player.x - 40,
      y: scenario.player.y + 20,
      sprite: scenario.partner.sprite,
      name: scenario.partner.name,
      maxHp: scenario.partner.maxHp,
      hp: scenario.partner.maxHp,
      attack: scenario.partner.attack,
      state: "follow", // follow / attack / rest
      target: null,
      atkCd: 0,
      restT: 0,
      bob: 0,
    };

    G.enemies = scenario.enemies.map((e) => ({
      ...e,
      hp: e.maxHp,
      alive: true,
      atkCd: 0,
      bob: Math.random ? 0 : 0, // ※Math.randomは使わない環境向けに固定
      phase: 0,
    }));

    G.chests = scenario.chests.map((c) => ({ ...c, opened: false }));
    G.npcs = scenario.npcs.map((n) => ({ ...n }));
    G.floaters = [];
    G.move.active = false;
    G.paused = false;
    const dlg = document.getElementById("dialogue");
    if (dlg) dlg.classList.add("hidden");
  }

  // ---- べんりな計算 ----
  function dist(ax, ay, bx, by) {
    const dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function addFloater(x, y, text, color) {
    G.floaters.push({ x, y, text, color: color || "#fff", life: 0.9 });
  }

  // ---- 入力：タップ／クリック ----
  function screenToWorld(sx, sy) {
    return { x: sx + G.cam.x, y: sy + G.cam.y };
  }

  function findInteractableAt(wx, wy) {
    // 敵 → たからばこ → NPC の順で近いものをさがす
    for (const e of G.enemies) {
      if (e.alive && dist(wx, wy, e.x, e.y) < ENTITY_R + 8)
        return { type: "enemy", obj: e };
    }
    for (const c of G.chests) {
      if (!c.opened && dist(wx, wy, c.x, c.y) < ENTITY_R + 8)
        return { type: "chest", obj: c };
    }
    for (const n of G.npcs) {
      if (dist(wx, wy, n.x, n.y) < ENTITY_R + 8) return { type: "npc", obj: n };
    }
    return null;
  }

  function handlePointer(clientX, clientY, isDown) {
    if (!G.running) return;

    // かいわ中は「つぎへ」だけ
    if (G.paused) {
      if (isDown) Dialogue.advance();
      return;
    }

    const w = screenToWorld(clientX, clientY);

    if (isDown) {
      const hit = findInteractableAt(w.x, w.y);
      if (hit) {
        interact(hit);
        return; // 触ったのが敵などなら、歩かない
      }
    }
    // それ以外は「ここへ歩く」
    G.move.active = true;
    G.move.tx = clamp(w.x, 10, G.world.width - 10);
    G.move.ty = clamp(w.y, 10, G.world.height - 10);
  }

  function interact(hit) {
    if (hit.type === "enemy") {
      // あいぼうを その敵に むかわせる
      G.partner.target = hit.obj;
      if (G.partner.state !== "rest") G.partner.state = "attack";
      G.partner.atkCd = 0.2;
    } else if (hit.type === "chest") {
      const c = hit.obj;
      c.opened = true;
      addFloater(c.x, c.y - 40, "たからばこ！", "#ffd76b");
      Dialogue.open("たからばこ", [c.message]);
    } else if (hit.type === "npc") {
      const n = hit.obj;
      Dialogue.open(n.name, n.lines);
    }
  }

  // ---- こうしん（毎フレーム） ----
  function update(dt) {
    if (G.paused) return;

    updatePlayer(dt);
    updatePartner(dt);
    updateEnemies(dt);
    updateFloaters(dt);
    updateCamera();
  }

  function updatePlayer(dt) {
    const p = G.player;
    // キーボード（パソコンで確認用）
    let kx = 0,
      ky = 0;
    if (G.keys["ArrowLeft"] || G.keys["a"]) kx -= 1;
    if (G.keys["ArrowRight"] || G.keys["d"]) kx += 1;
    if (G.keys["ArrowUp"] || G.keys["w"]) ky -= 1;
    if (G.keys["ArrowDown"] || G.keys["s"]) ky += 1;

    if (kx || ky) {
      G.move.active = false; // キーを使ったら 目標歩きは解除
      const len = Math.sqrt(kx * kx + ky * ky) || 1;
      p.x += (kx / len) * p.speed * dt;
      p.y += (ky / len) * p.speed * dt;
    } else if (G.move.active) {
      const d = dist(p.x, p.y, G.move.tx, G.move.ty);
      if (d < 4) {
        G.move.active = false;
      } else {
        const step = Math.min(p.speed * dt, d);
        p.x += ((G.move.tx - p.x) / d) * step;
        p.y += ((G.move.ty - p.y) / d) * step;
      }
    }
    p.x = clamp(p.x, 20, G.world.width - 20);
    p.y = clamp(p.y, 20, G.world.height - 20);
  }

  function updatePartner(dt) {
    const pt = G.partner;
    const p = G.player;
    pt.bob += dt * 6;

    // つかれて休んでいる
    if (pt.state === "rest") {
      pt.restT -= dt;
      pt.hp = Math.min(pt.maxHp, pt.hp + pt.maxHp * dt * 0.5); // だんだん回復
      followPlayer(pt, p, dt, 220);
      if (pt.restT <= 0) {
        pt.hp = pt.maxHp;
        pt.state = "follow";
      }
      return;
    }

    // 敵にむかって たたかう
    if (pt.state === "attack" && pt.target && pt.target.alive) {
      const e = pt.target;
      const d = dist(pt.x, pt.y, e.x, e.y);
      const range = 46;
      if (d > range) {
        const step = Math.min(230 * dt, d - range + 1);
        pt.x += ((e.x - pt.x) / d) * step;
        pt.y += ((e.y - pt.y) / d) * step;
      } else {
        // こうげき
        pt.atkCd -= dt;
        if (pt.atkCd <= 0) {
          pt.atkCd = 0.7;
          e.hp -= pt.attack;
          addFloater(e.x, e.y - 38, "-" + pt.attack, "#fff");
          if (e.hp <= 0) defeatEnemy(e);
        }
      }
      if (pt.hp <= 0) {
        pt.state = "rest";
        pt.restT = 3;
        pt.target = null;
        addFloater(pt.x, pt.y - 40, "つかれた…💤", "#9fd");
      }
      return;
    }

    // ふだん：しゅじんこうについていく
    if (pt.state !== "follow") pt.state = "follow";
    followPlayer(pt, p, dt, 300);
  }

  function followPlayer(pt, p, dt, speed) {
    const goalX = p.x - 42;
    const goalY = p.y + 24;
    const d = dist(pt.x, pt.y, goalX, goalY);
    if (d > 6) {
      const step = Math.min(speed * dt, d);
      pt.x += ((goalX - pt.x) / d) * step;
      pt.y += ((goalY - pt.y) / d) * step;
    }
  }

  function updateEnemies(dt) {
    const pt = G.partner;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      e.phase += dt * 4;
      // あいぼうが 近くで たたかっていたら、はんげき
      if (pt.state === "attack" && pt.target === e) {
        const d = dist(pt.x, pt.y, e.x, e.y);
        if (d <= 52) {
          e.atkCd -= dt;
          if (e.atkCd <= 0) {
            e.atkCd = 1.0;
            pt.hp -= e.attack;
            addFloater(pt.x, pt.y - 38, "-" + e.attack, "#ff8f8f");
          }
        }
      }
    }
  }

  function defeatEnemy(e) {
    e.alive = false;
    addFloater(e.x, e.y - 30, "たおした！✨", "#ffe36b");
    G.partner.target = null;
    G.partner.state = "follow";

    // ボスをたおしたら クリア演出
    if (e.id === "boss") {
      setTimeout(() => {
        Dialogue.open("しま", [
          "ボスネコを たおした！",
          "しまに へいわが もどった！ ミィと リイコは えいゆうだ！🎉",
        ]);
      }, 500);
    }
  }

  function updateFloaters(dt) {
    for (const f of G.floaters) {
      f.y -= 28 * dt;
      f.life -= dt;
    }
    G.floaters = G.floaters.filter((f) => f.life > 0);
  }

  function updateCamera() {
    const p = G.player;
    let cx = p.x - viewW / 2;
    let cy = p.y - viewH / 2;
    // 世界が画面より大きいときだけ動かす。小さいときは中央に。
    if (G.world.width > viewW) cx = clamp(cx, 0, G.world.width - viewW);
    else cx = (G.world.width - viewW) / 2;
    if (G.world.height > viewH) cy = clamp(cy, 0, G.world.height - viewH);
    else cy = (G.world.height - viewH) / 2;
    G.cam.x = cx;
    G.cam.y = cy;
  }

  // ---- びょうが ----
  function draw() {
    // 地面
    ctx.fillStyle = G.world.ground || "#8fca7a";
    ctx.fillRect(0, 0, viewW, viewH);

    // 地面のもよう（うすい格子）
    drawGrid();

    const ox = -G.cam.x,
      oy = -G.cam.y;

    // かざり
    for (const d of G.decorations) {
      drawSprite(d.sprite, d.x + ox, d.y + oy, 36);
    }

    // たからばこ
    for (const c of G.chests) {
      drawSprite(c.opened ? "📭" : "🎁", c.x + ox, c.y + oy, 34);
    }

    // NPC
    for (const n of G.npcs) {
      drawSprite(n.sprite, n.x + ox, n.y + oy, 38);
      drawNameTag(n.name, n.x + ox, n.y + oy - 34);
    }

    // 敵（HPバーつき）
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const bob = Math.sin(e.phase) * 3;
      drawSprite(e.sprite, e.x + ox, e.y + oy + bob, 40);
      drawHpBar(e.x + ox, e.y + oy - 32, e.hp, e.maxHp, "#ff6b6b");
    }

    // あいぼう（ねこ）
    const pt = G.partner;
    const ptBob = Math.sin(pt.bob) * 2;
    drawSprite(pt.sprite, pt.x + ox, pt.y + oy + ptBob, 34);
    drawHpBar(pt.x + ox, pt.y + oy - 28, pt.hp, pt.maxHp, "#69c56b");
    if (pt.state === "rest") drawSprite("💤", pt.x + ox + 18, pt.y + oy - 24, 18);

    // しゅじんこう
    drawSprite(G.player.sprite, G.player.x + ox, G.player.y + oy, 42);

    // ふわっと文字
    for (const f of G.floaters) {
      ctx.globalAlpha = clamp(f.life / 0.9, 0, 1);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x + ox, f.y + oy);
      ctx.fillText(f.text, f.x + ox, f.y + oy);
      ctx.globalAlpha = 1;
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const size = 64;
    const startX = -((G.cam.x % size) + size) % size;
    const startY = -((G.cam.y % size) + size) % size;
    ctx.beginPath();
    for (let x = startX; x < viewW; x += size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
    }
    for (let y = startY; y < viewH; y += size) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
    }
    ctx.stroke();
  }

  function drawSprite(sprite, x, y, size) {
    ctx.font = size + "px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sprite, x, y);
  }

  function drawHpBar(x, y, hp, maxHp, color) {
    const w = 40,
      h = 6;
    const ratio = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#444";
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * ratio, h);
  }

  function drawNameTag(name, x, y) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(name).width + 12;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(x - w / 2, y - 9, w, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(name, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- メインループ ----
  function loop(ts) {
    if (!G.running) return;
    const dt = Math.min((ts - G.last) / 1000 || 0, 0.05);
    G.last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- かいわウィンドウ ----
  const Dialogue = {
    box: document.getElementById("dialogue"),
    nameEl: document.getElementById("dialogue-name"),
    textEl: document.getElementById("dialogue-text"),
    lines: [],
    idx: 0,
    open(name, lines) {
      this.lines = lines;
      this.idx = 0;
      this.nameEl.textContent = name;
      this.textEl.textContent = lines[0];
      this.box.classList.remove("hidden");
      G.paused = true;
    },
    advance() {
      this.idx++;
      if (this.idx >= this.lines.length) {
        this.close();
      } else {
        this.textEl.textContent = this.lines[this.idx];
      }
    },
    close() {
      this.box.classList.add("hidden");
      G.paused = false;
    },
  };
  // かいわウィンドウ自体のタップでも つぎへ
  Dialogue.box.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
    Dialogue.advance();
  });

  // ---- 入力イベント ----
  function bindInput() {
    canvas.addEventListener(
      "pointerdown",
      (ev) => {
        handlePointer(ev.clientX, ev.clientY, true);
      },
      { passive: false }
    );
    canvas.addEventListener("pointermove", (ev) => {
      if (ev.buttons) handlePointer(ev.clientX, ev.clientY, false);
    });
    window.addEventListener("keydown", (e) => {
      G.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      G.keys[e.key] = false;
    });
  }

  // ---- そとから呼ぶ ----
  window.RiikoGame = {
    start(scenario) {
      resize();
      setup(scenario);
      bindInput();
      G.running = true;
      G.last = performance.now();
      requestAnimationFrame(loop);

      // ヒントは数秒で うすくする
      const hint = document.getElementById("hint");
      if (hint) setTimeout(() => (hint.style.opacity = "0"), 5000);
    },
    // テスト用：手動で1フレーム進める／状態をのぞく（ふだんは使いません）
    _test: {
      state: G,
      step: (dt) => {
        update(dt);
        draw();
      },
      tap: (worldX, worldY) => {
        const hit = findInteractableAt(worldX, worldY);
        if (hit) interact(hit);
        else {
          G.move.active = true;
          G.move.tx = clamp(worldX, 10, G.world.width - 10);
          G.move.ty = clamp(worldY, 10, G.world.height - 10);
        }
      },
    },
  };
})();
