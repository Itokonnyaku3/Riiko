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

  // ---- キャラの当たりの大きさ（半径） ----
  const PLAYER_R = 18;
  const CAT_R = 14;
  const ENEMY_R = 18;
  const TAP_R = 40; // 敵をタップしたと判定する ゆるさ

  // ---- 画面サイズ（固定）----
  //   ゲームの中の大きさは いつも LOGICAL_W × LOGICAL_H。
  //   じっさいの表示は、画面に合わせて 拡大/縮小します（アスペクト比は固定）。
  const LOGICAL_W = 900;
  const LOGICAL_H = 600;
  let viewW = LOGICAL_W,
    viewH = LOGICAL_H,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = LOGICAL_W;
    viewH = LOGICAL_H;
    canvas.width = Math.floor(LOGICAL_W * dpr);
    canvas.height = Math.floor(LOGICAL_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 画面に収まるように CSS 表示サイズを決める（アスペクト比は固定）
    const scale = Math.min(
      window.innerWidth / LOGICAL_W,
      window.innerHeight / LOGICAL_H
    );
    canvas.style.width = Math.round(LOGICAL_W * scale) + "px";
    canvas.style.height = Math.round(LOGICAL_H * scale) + "px";
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
    obstacles: [],
    decorations: [],
    bullets: [],
    floaters: [], // ふわっと出る文字（ダメージなど）
    gates: [], // とびら（なぞ解きで あく）
    exit: null, // つぎのステージへの 出口
    items: {}, // あつめたアイテムの数（例：{ ほうせき: 2 }）
    bossDefeated: false,
    keys: {},
    move: { active: false, tx: 0, ty: 0 }, // 「ここへ歩く」目標
  };

  // ---- しょきか ----
  function setup(scenario) {
    G.world = scenario.world;
    G.obstacles = (scenario.obstacles || []).map((o) => ({ ...o }));
    G.decorations = (scenario.decorations || []).map((d) => ({ ...d }));

    G.player = {
      x: scenario.player.x,
      y: scenario.player.y,
      sprite: scenario.player.sprite,
      name: scenario.player.name,
      speed: 150,
      moving: false,
      stuckT: 0,
      trail: [], // 通ったあと（ねこが これを おいかける）
    };

    G.partner = {
      x: scenario.player.x - 44,
      y: scenario.player.y + 26,
      sprite: scenario.partner.sprite,
      name: scenario.partner.name,
      maxHp: scenario.partner.maxHp,
      hp: scenario.partner.maxHp,
      attack: scenario.partner.attack,
      state: "follow", // follow / attack / rest / goto
      target: null,
      gotoX: 0,
      gotoY: 0,
      atkCd: 0,
      restT: 0,
      bob: 0,
      wanderT: 0,
      idleT: 0,
      orbitA: 0,
    };

    G.enemies = scenario.enemies.map((e) => ({
      ...e,
      hp: e.maxHp,
      alive: true,
      atkCd: 0,
      shootCd: e.shootInterval ? e.shootInterval * 0.6 : 0,
      phase: 0,
      home: { x: e.x, y: e.y },
    }));

    G.chests = scenario.chests.map((c) => ({ ...c, opened: false }));
    G.npcs = scenario.npcs.map((n) => ({ ...n, _inside: false }));

    // とびら：かべ(木/レンガ)を 障害物に くわえる（あいたら 消える）
    G.gates = (scenario.gates || []).map((g) => ({ ...g, open: false, _inside: false }));
    for (const g of G.gates) {
      for (const w of g.wall || []) {
        G.obstacles.push({ ...w, gateId: g.id });
      }
    }

    G.exit = scenario.exit ? { ...scenario.exit, _done: false } : null;
    G.items = {};
    G.bossDefeated = false;
    G.bullets = [];
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

  // ---- しょうがいぶつ：めりこみを外に押し出す（スライドできる） ----
  function resolveObstacles(ent, radius) {
    for (const o of G.obstacles) {
      const dx = ent.x - o.x,
        dy = ent.y - o.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const min = o.r + radius;
      if (d < min) {
        if (d < 0.001) {
          ent.x = o.x + min;
        } else {
          ent.x = o.x + (dx / d) * min;
          ent.y = o.y + (dy / d) * min;
        }
      }
    }
  }

  // ---- しょうがいぶつを「自動でよける」進む向きの計算 ----
  function steerAround(x, y, dirX, dirY, radius) {
    let ax = dirX,
      ay = dirY;
    for (const o of G.obstacles) {
      const dx = o.x - x,
        dy = o.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const reach = o.r + radius + 26; // これより近い障害物をよける
      if (d < reach && d > 0.001) {
        const nx = dx / d,
          ny = dy / d;
        const ahead = nx * dirX + ny * dirY; // 進行方向の前にあるか
        if (ahead > 0) {
          const strength = (1 - d / reach) * ahead;
          // 障害物の横へ すべる向き（左右どちらか、今の向きに近いほう）
          let px = -ny,
            py = nx;
          if (px * dirX + py * dirY < 0) {
            px = ny;
            py = -nx;
          }
          ax += px * strength * 1.8;
          ay += py * strength * 1.8;
        }
      }
    }
    const len = Math.sqrt(ax * ax + ay * ay) || 1;
    return { x: ax / len, y: ay / len };
  }

  // 目標にむかって 1歩すすむ（よけ＋押し出しつき）
  function stepToward(ent, tx, ty, speed, dt, radius, avoid) {
    const dx = tx - ent.x,
      dy = ty - ent.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return 0;
    let dirX = dx / d,
      dirY = dy / d;
    if (avoid) {
      const s = steerAround(ent.x, ent.y, dirX, dirY, radius);
      dirX = s.x;
      dirY = s.y;
    }
    const step = Math.min(speed * dt, d);
    ent.x += dirX * step;
    ent.y += dirY * step;
    resolveObstacles(ent, radius);
    return step;
  }

  // ---- 入力：タップ／クリック ----
  //   画面上の指の位置（clientX/Y）を、ゲームの中の座標に変換する。
  //   canvas は 画面に合わせて拡大されているので、その ばいりつ を計算する。
  function clientToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const lx = (clientX - rect.left) * (LOGICAL_W / rect.width);
    const ly = (clientY - rect.top) * (LOGICAL_H / rect.height);
    return { x: lx + G.cam.x, y: ly + G.cam.y };
  }

  function findEnemyAt(wx, wy) {
    let best = null,
      bestD = TAP_R + 8;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const d = dist(wx, wy, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function handlePointer(clientX, clientY, isDown) {
    if (!G.running) return;

    // かいわ中は「つぎへ」だけ
    if (G.paused) {
      if (isDown) Dialogue.advance();
      return;
    }

    // タップ／クリックは「ねこ」への めいれい（主人公は うごかない）
    const w = clientToWorld(clientX, clientY);
    const e = findEnemyAt(w.x, w.y);
    if (e) {
      commandCat(e); // 敵をタップ＝あいぼうを差し向けて たたかう
    } else {
      commandCatMove(w.x, w.y); // じめんをタップ＝あいぼうを そこへ進ませる
    }
  }

  function commandCat(enemy) {
    if (G.partner.state === "rest") return; // つかれ中は うごけない
    G.partner.target = enemy;
    G.partner.state = "attack";
    G.partner.atkCd = 0.2;
  }

  function commandCatMove(wx, wy) {
    if (G.partner.state === "rest") return;
    G.partner.target = null;
    G.partner.state = "goto";
    G.partner.gotoX = clamp(wx, 10, G.world.width - 10);
    G.partner.gotoY = clamp(wy, 10, G.world.height - 10);
  }

  // ---- こうしん（毎フレーム） ----
  function update(dt) {
    if (G.paused) return;
    updatePlayer(dt);
    checkTriggers(); // ぶつかって発生するイベント
    updatePartner(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateFloaters(dt);
    updateCamera();
  }

  function updatePlayer(dt) {
    const p = G.player;
    const prevX = p.x,
      prevY = p.y;

    // キーボード（パソコンで確認用）
    let kx = 0,
      ky = 0;
    if (G.keys["ArrowLeft"] || G.keys["a"]) kx -= 1;
    if (G.keys["ArrowRight"] || G.keys["d"]) kx += 1;
    if (G.keys["ArrowUp"] || G.keys["w"]) ky -= 1;
    if (G.keys["ArrowDown"] || G.keys["s"]) ky += 1;

    // 主人公は キーボード／ほうこうボタン だけで うごく
    if (kx || ky) {
      const len = Math.sqrt(kx * kx + ky * ky) || 1;
      p.x += (kx / len) * p.speed * dt;
      p.y += (ky / len) * p.speed * dt;
      resolveObstacles(p, PLAYER_R);
    }

    p.x = clamp(p.x, 20, G.world.width - 20);
    p.y = clamp(p.y, 20, G.world.height - 20);

    // うごいたか？（ねこの追従につかう）
    const moved = dist(p.x, p.y, prevX, prevY);
    p.moving = moved > 0.4;

    // 通ったあとを記録（ねこが これを おいかける）
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 70) p.trail.shift();
  }

  // ---- ぶつかって発生するイベント（宝箱・会話・とびら・出口） ----
  function checkTriggers() {
    const p = G.player;

    // たからばこ（あけると アイテムが 手に入る）
    for (const c of G.chests) {
      if (!c.opened && dist(p.x, p.y, c.x, c.y) < PLAYER_R + 26) {
        c.opened = true;
        if (c.key) G.items[c.key] = (G.items[c.key] || 0) + 1;
        addFloater(c.x, c.y - 40, "たからばこ！", "#ffd76b");
        Dialogue.open("たからばこ", [c.message]);
        return;
      }
    }

    // とびら（アイテムが そろうと あく。まだなら ヒントを出す）
    for (const g of G.gates) {
      if (g.open) continue;
      const have = G.items[g.requireKey] || 0;
      if (have >= g.requireCount) {
        g.open = true;
        G.obstacles = G.obstacles.filter((o) => o.gateId !== g.id);
        addFloater(g.x, g.y - 30, "ひらいた！✨", "#ffe36b");
        Dialogue.open("とびら", g.openLines || ["とびらが ひらいた！"]);
        return;
      }
      const near = dist(p.x, p.y, g.x, g.y) < (g.r || 40) + 26;
      if (near && !g._inside) {
        g._inside = true;
        const lines = (g.lockedLines || ["かたく とじている…"]).map((s) =>
          s.replace("{have}", have).replace("{need}", g.requireCount)
        );
        Dialogue.open("とびら", lines);
        return;
      }
      if (!near) g._inside = false;
    }

    // とうじょうじんぶつ（ヒントをくれる）
    for (const n of G.npcs) {
      const near = dist(p.x, p.y, n.x, n.y) < PLAYER_R + 30;
      if (near && !n._inside) {
        n._inside = true;
        Dialogue.open(n.name, n.lines);
        return;
      }
      if (!near) n._inside = false;
    }

    // 出口（ボスをたおすと つかえる）
    if (G.exit) {
      const near = dist(p.x, p.y, G.exit.x, G.exit.y) < (G.exit.r || 40);
      if (near && G.bossDefeated && !G.exit._done) {
        G.exit._done = true;
        Dialogue.open("しゅつぐち", G.exit.lines || ["つぎの ステージへ！"]);
        return;
      }
    }
  }

  // ---- あいぼう（ねこ） ----
  function updatePartner(dt) {
    const pt = G.partner;
    pt.bob += dt * 6;
    pt.wanderT += dt;

    // つかれて休んでいる
    if (pt.state === "rest") {
      pt.restT -= dt;
      pt.hp = Math.min(pt.maxHp, pt.hp + pt.maxHp * dt * 0.5);
      followPlayer(pt, dt);
      if (pt.restT <= 0) {
        pt.hp = pt.maxHp;
        pt.state = "follow";
      }
      return;
    }

    // タップされた じめんへ 進む
    if (pt.state === "goto") {
      const d = dist(pt.x, pt.y, pt.gotoX, pt.gotoY);
      if (d < 12) {
        pt.state = "follow"; // ついたら また ついてくる
      } else {
        stepToward(pt, pt.gotoX, pt.gotoY, 240, dt, CAT_R, true);
      }
      return;
    }

    // 敵にむかって たたかう
    if (pt.state === "attack" && pt.target && pt.target.alive) {
      const e = pt.target;
      const d = dist(pt.x, pt.y, e.x, e.y);
      const range = 46;
      if (d > range) {
        // 障害物をよけて 敵へ近づく
        stepToward(pt, e.x, e.y, 230, dt, CAT_R, true);
      } else {
        pt.atkCd -= dt;
        if (pt.atkCd <= 0) {
          pt.atkCd = 0.7;
          e.hp -= pt.attack;
          addFloater(e.x, e.y - 38, "-" + pt.attack, "#fff");
          if (e.hp <= 0) defeatEnemy(e);
        }
      }
      if (pt.hp <= 0) faint(pt);
      return;
    }

    // ふだん：しゅじんこうを 少しおくれて・少しはなれて おいかける
    if (pt.state !== "follow") pt.state = "follow";
    followPlayer(pt, dt);
  }

  function faint(pt) {
    pt.state = "rest";
    pt.restT = 3;
    pt.target = null;
    addFloater(pt.x, pt.y - 40, "つかれた…💤", "#9fd");
  }

  // ねこの おいかたり（おくれ・はなれ・ゆらぎ・止まると まわる）
  function followPlayer(pt, dt) {
    const p = G.player;

    if (p.moving) pt.idleT = 0;
    else pt.idleT += dt;

    let tx, ty;
    if (pt.idleT > 0.5) {
      // 主人公が 止まっているとき → まわりを ぐるぐる
      pt.orbitA += dt * (1.1 + Math.sin(pt.wanderT * 0.7) * 0.3);
      const r = 36 + Math.sin(pt.wanderT * 0.9) * 10;
      tx = p.x + Math.cos(pt.orbitA) * r;
      ty = p.y + Math.sin(pt.orbitA) * r * 0.7;
    } else {
      // うごいているとき → 通ったあとを 少しおくれて おいかける
      const idx = Math.max(0, p.trail.length - 16);
      const base = p.trail[idx] || p;
      const wx = Math.sin(pt.wanderT * 1.7) * 10 + Math.cos(pt.wanderT * 0.6) * 6;
      const wy = Math.cos(pt.wanderT * 1.3) * 10 + Math.sin(pt.wanderT * 0.8) * 6;
      tx = base.x + wx;
      ty = base.y + wy;
      // まわる角度を 今の位置に あわせておく（切りかわりを なめらかに）
      pt.orbitA = Math.atan2(pt.y - p.y, pt.x - p.x);
    }

    // 近いときは ゆっくり（自然なおくれ）、遠いときは 速く追いつく
    const dx = tx - pt.x,
      dy = ty - pt.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const deadzone = 6;
    if (d > deadzone) {
      const speed = Math.min(d * 4.2, 240);
      const step = Math.min(speed * dt, d);
      pt.x += (dx / d) * step;
      pt.y += (dy / d) * step;
      resolveObstacles(pt, CAT_R);
    }
  }

  // ---- てき ----
  function updateEnemies(dt) {
    const pt = G.partner;
    const p = G.player;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      e.phase += dt * 4;

      const engaged =
        pt.state === "attack" &&
        pt.target === e &&
        dist(pt.x, pt.y, e.x, e.y) <= 52;

      if (engaged) {
        // せっきん戦：うごかず はんげき
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = 1.0;
          pt.hp -= e.attack;
          addFloater(pt.x, pt.y - 38, "-" + e.attack, "#ff8f8f");
          if (pt.hp <= 0) faint(pt);
        }
      } else {
        moveEnemy(e, dt, p);
      }

      // 弾を撃つタイプ（せっきん戦でも 撃つ）
      if (e.behavior === "shooter") updateShooter(e, dt, p);
    }
  }

  function moveEnemy(e, dt, p) {
    if (e.behavior === "chase") {
      const d = dist(e.x, e.y, p.x, p.y);
      if (d < (e.sight || 240)) {
        stepToward(e, p.x, p.y, e.speed || 50, dt, ENEMY_R, true);
      } else {
        stepToward(e, e.home.x, e.home.y, (e.speed || 50) * 0.6, dt, ENEMY_R, true);
      }
    } else if (e.behavior === "patrol") {
      const r = e.patrolRange || 80;
      const tx = e.home.x + Math.sin(e.phase * 0.5) * r;
      const ty = e.home.y + Math.cos(e.phase * 0.35) * r * 0.5;
      stepToward(e, tx, ty, e.speed || 35, dt, ENEMY_R, true);
    } else if (e.behavior === "shooter") {
      const tx = e.home.x + Math.sin(e.phase * 0.3) * 20;
      const ty = e.home.y + Math.cos(e.phase * 0.3) * 20;
      stepToward(e, tx, ty, e.speed || 18, dt, ENEMY_R, false);
    }
  }

  function updateShooter(e, dt, p) {
    e.shootCd -= dt;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < (e.sight || 320) && e.shootCd <= 0) {
      e.shootCd = e.shootInterval || 1.8;
      const dx = p.x - e.x,
        dy = p.y - e.y;
      const dd = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = e.bulletSpeed || 140;
      G.bullets.push({
        x: e.x,
        y: e.y,
        vx: (dx / dd) * sp,
        vy: (dy / dd) * sp,
        dmg: e.bulletDamage || 3,
        life: 4,
      });
    }
  }

  function defeatEnemy(e) {
    e.alive = false;
    addFloater(e.x, e.y - 30, "たおした！✨", "#ffe36b");
    G.partner.target = null;
    G.partner.state = "follow";

    if (e.id === "boss") {
      G.bossDefeated = true;
      setTimeout(() => {
        Dialogue.open("しま", [
          "ボスネコを たおした！",
          "うえに 光る とびらが あらわれた…",
          "ちかづくと つぎの ステージへ いけそうだ！🎉",
        ]);
      }, 500);
    }
  }

  // ---- 弾 ----
  function updateBullets(dt) {
    const pt = G.partner;
    for (const b of G.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // あいぼうに当たる（主人公には当たらない＝やさしい設計）
      if (pt.state !== "rest" && dist(b.x, b.y, pt.x, pt.y) < CAT_R + 8) {
        pt.hp -= b.dmg;
        addFloater(pt.x, pt.y - 38, "-" + b.dmg, "#ff8f8f");
        b.life = 0;
        if (pt.hp <= 0) faint(pt);
        continue;
      }
      // 障害物に当たったら 消える
      for (const o of G.obstacles) {
        if (dist(b.x, b.y, o.x, o.y) < o.r) {
          b.life = 0;
          break;
        }
      }
    }
    G.bullets = G.bullets.filter(
      (b) =>
        b.life > 0 &&
        b.x > -20 &&
        b.y > -20 &&
        b.x < G.world.width + 20 &&
        b.y < G.world.height + 20
    );
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
    if (G.world.width > viewW) cx = clamp(cx, 0, G.world.width - viewW);
    else cx = (G.world.width - viewW) / 2;
    if (G.world.height > viewH) cy = clamp(cy, 0, G.world.height - viewH);
    else cy = (G.world.height - viewH) / 2;
    G.cam.x = cx;
    G.cam.y = cy;
  }

  // ---- びょうが ----
  function draw() {
    const ox = -G.cam.x,
      oy = -G.cam.y;

    ctx.fillStyle = G.world.ground || "#8fca7a";
    ctx.fillRect(0, 0, viewW, viewH);
    drawAreas(ox, oy); // あるける じめん（マップ作成ツールで ぬった ところ）
    drawGrid();

    // 画面の外にあるものは えがかない（木がたくさんあっても かるく動く）
    const onScreen = (x, y, m) =>
      x + ox > -m && x + ox < viewW + m && y + oy > -m && y + oy < viewH + m;

    for (const d of G.decorations) {
      if (onScreen(d.x, d.y, 40)) drawSprite(d.sprite, d.x + ox, d.y + oy, 30);
    }

    // しょうがいぶつ（かげ＋絵）
    for (const o of G.obstacles) {
      if (!onScreen(o.x, o.y, 60)) continue;
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(o.x + ox, o.y + oy + o.r * 0.5, o.r, o.r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000"; // かげの うすい色を もどす（絵文字が うすくならないように）
      drawSprite(o.sprite, o.x + ox, o.y + oy, o.r * 1.7);
    }

    for (const c of G.chests) {
      if (onScreen(c.x, c.y, 40))
        drawSprite(c.opened ? "📭" : "🎁", c.x + ox, c.y + oy, 34);
    }

    // とびら
    for (const g of G.gates) {
      if (!onScreen(g.x, g.y, 60)) continue;
      drawSprite("🚪", g.x + ox, g.y + oy, 42);
      if (!g.open) drawSprite("🔒", g.x + ox, g.y + oy - 30, 22);
    }

    // 出口（つぎのステージへ。ボスをたおすと 光る）
    if (G.exit && onScreen(G.exit.x, G.exit.y, 60)) {
      ctx.globalAlpha = G.bossDefeated ? 1 : 0.4;
      drawSprite("⛩️", G.exit.x + ox, G.exit.y + oy, 48);
      ctx.globalAlpha = 1;
      drawNameTag("つぎのステージへ", G.exit.x + ox, G.exit.y + oy - 36);
    }

    for (const n of G.npcs) {
      if (!onScreen(n.x, n.y, 40)) continue;
      drawSprite(n.sprite, n.x + ox, n.y + oy, 38);
      drawNameTag(n.name, n.x + ox, n.y + oy - 34);
    }

    for (const e of G.enemies) {
      if (!e.alive) continue;
      const bob = Math.sin(e.phase) * 3;
      drawSprite(e.sprite, e.x + ox, e.y + oy + bob, 40);
      drawHpBar(e.x + ox, e.y + oy - 32, e.hp, e.maxHp, "#ff6b6b");
    }

    // 弾
    for (const b of G.bullets) {
      ctx.fillStyle = "#ff5a5a";
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y + oy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // あいぼう
    const pt = G.partner;
    const ptBob = Math.sin(pt.bob) * 2;
    drawSprite(pt.sprite, pt.x + ox, pt.y + oy + ptBob, 34);
    drawHpBar(pt.x + ox, pt.y + oy - 28, pt.hp, pt.maxHp, "#69c56b");
    if (pt.state === "rest") drawSprite("💤", pt.x + ox + 18, pt.y + oy - 24, 18);

    drawSprite(G.player.sprite, G.player.x + ox, G.player.y + oy, 42);

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

    drawHud();
  }

  // あつめたアイテムの かず（とびらの じょうけん）を 左上に表示
  function drawHud() {
    const g = G.gates[0];
    if (!g || g.open) return;
    const have = G.items[g.requireKey] || 0;
    const text = (g.hudIcon || "🔮") + " " + have + " / " + g.requireCount;
    ctx.font = "bold 22px system-ui, 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 26;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(12, 12, w, 38, 11);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, 25, 32);
  }

  // あるける じめんを 色ちがいで ぬる（world.areas がある ときだけ）
  function drawAreas(ox, oy) {
    const areas = (G.world && G.world.areas) || [];
    for (const a of areas) {
      ctx.fillStyle = a.color || "#8fca7a";
      if (a.shape === "circle") {
        if (a.x + a.r + ox < 0 || a.x - a.r + ox > viewW) continue;
        if (a.y + a.r + oy < 0 || a.y - a.r + oy > viewH) continue;
        ctx.beginPath();
        ctx.arc(a.x + ox, a.y + oy, a.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        if (a.x + a.w + ox < 0 || a.x + ox > viewW) continue;
        if (a.y + a.h + oy < 0 || a.y + oy > viewH) continue;
        roundRect(a.x + ox, a.y + oy, a.w, a.h, Math.min(18, a.w / 2, a.h / 2));
        ctx.fill();
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const size = 64;
    const startX = -(((G.cam.x % size) + size) % size);
    const startY = -(((G.cam.y % size) + size) % size);
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
      if (this.idx >= this.lines.length) this.close();
      else this.textEl.textContent = this.lines[this.idx];
    },
    close() {
      this.box.classList.add("hidden");
      G.paused = false;
    },
  };
  Dialogue.box.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
    Dialogue.advance();
  });

  // ---- 入力イベント ----
  function bindInput() {
    canvas.addEventListener(
      "pointerdown",
      (ev) => handlePointer(ev.clientX, ev.clientY, true),
      { passive: false }
    );
    canvas.addEventListener("pointermove", (ev) => {
      if (ev.buttons) handlePointer(ev.clientX, ev.clientY, false);
    });
    window.addEventListener("keydown", (e) => (G.keys[e.key] = true));
    window.addEventListener("keyup", (e) => (G.keys[e.key] = false));
  }

  let inputBound = false;

  // ---- そとから呼ぶ ----
  window.RiikoGame = {
    start(scenario) {
      resize();
      setup(scenario);
      if (!inputBound) {
        bindInput();
        inputBound = true;
      }
      G.running = true;
      G.last = performance.now();
      requestAnimationFrame(loop);

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
      tapEnemy: (x, y) => {
        const e = findEnemyAt(x, y);
        if (e) commandCat(e);
        return e ? e.id : null;
      },
      catTo: (x, y) => commandCatMove(x, y),
      press: (key, down) => {
        G.keys[key] = down;
      },
    },
  };
})();
