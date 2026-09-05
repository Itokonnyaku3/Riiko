/*
 * =========================================================
 *  スタート＆あいことば（かんたんな目隠し）
 * =========================================================
 *  ※ これは「知らない人がうっかり遊べない」ていどの目隠しです。
 *    本かくてきな鍵ではありません（あんしんな あそび用）。
 * =========================================================
 */
(function () {
  "use strict";

  const gate = document.getElementById("gate");
  const authArea = document.getElementById("gate-auth-area");
  const menuArea = document.getElementById("gate-menu-area");
  const input = document.getElementById("gate-input");
  const btn = document.getElementById("gate-btn");
  const contBtn = document.getElementById("gate-continue");
  const stageSelect = document.getElementById("gate-stage-select");
  const startStageBtn = document.getElementById("gate-start-stage");
  const newBtn = document.getElementById("gate-new");
  const errEl = document.getElementById("gate-error");
  const titleBtn = document.getElementById("btn-title");
  const soundBtn = document.getElementById("btn-sound");
  const editorBadge = document.getElementById("gate-editor-badge");
  const editorResetBtn = document.getElementById("gate-editor-reset");

  const STORAGE_KEY = "riiko_ok";

  // ゲーム開始
  function begin(stageId, cont) {
    gate.style.display = "none";
    window.RiikoGame.start(stageId || null, { continue: !!cont });
  }

  // エディタマップ連携バッジの更新
  function updateEditorBadge() {
    if (!editorBadge) return;
    const stageId = stageSelect ? stageSelect.value : "stage1";
    if (window.RiikoGame.hasEditedMap && window.RiikoGame.hasEditedMap(stageId)) {
      editorBadge.classList.remove("hidden");
    } else {
      editorBadge.classList.add("hidden");
    }
  }

  // ステージ選択ドロップダウンの更新
  function populateStageSelect() {
    if (!stageSelect) return;
    stageSelect.innerHTML = "";
    const list = window.RiikoGame.getStageList ? window.RiikoGame.getStageList() : [];
    for (const st of list) {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = st.title;
      stageSelect.appendChild(opt);
    }
  }

  // メニュー画面の更新表示
  function showMenu() {
    if (authArea) authArea.classList.add("hidden");
    if (menuArea) menuArea.classList.remove("hidden");
    populateStageSelect();

    const save = window.RiikoGame.getSaveInfo ? window.RiikoGame.getSaveInfo() : null;
    if (contBtn) {
      if (save) {
        contBtn.textContent = "▶ つづきから（" + save.title + "）";
        contBtn.classList.remove("hidden");
        if (stageSelect) stageSelect.value = save.stageId;
      } else {
        contBtn.classList.add("hidden");
      }
    }
    updateEditorBadge();
  }

  // 認証・スタート画面の表示
  function showAuth() {
    if (authArea) authArea.classList.remove("hidden");
    if (menuArea) menuArea.classList.remove("hidden"); // 面選択ボックスも表示して選択可能にする
    populateStageSelect();

    const save = window.RiikoGame.getSaveInfo ? window.RiikoGame.getSaveInfo() : null;
    if (contBtn) {
      if (save) {
        contBtn.textContent = "▶ つづきから（" + save.title + "）";
        contBtn.classList.remove("hidden");
        if (stageSelect) stageSelect.value = save.stageId;
      } else {
        contBtn.classList.add("hidden");
      }
    }
    updateEditorBadge();
    if (input) setTimeout(() => input.focus(), 200);
  }

  // あいことば認証
  function tryPassword() {
    const val = (input.value || "").trim().toLowerCase();
    if (val === String(GAME_CONFIG.password).toLowerCase()) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {}
      if (errEl) errEl.textContent = "";
      showMenu();
    } else {
      if (errEl) errEl.textContent = "あいことばが ちがうよ";
      input.value = "";
      input.focus();
    }
  }

  if (btn) btn.addEventListener("click", tryPassword);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryPassword();
    });
  }

  // つづきから
  if (contBtn) {
    contBtn.addEventListener("click", () => {
      begin(null, true);
    });
  }

  // えらんだ面から はじめる
  if (startStageBtn) {
    startStageBtn.addEventListener("click", () => {
      const selected = stageSelect ? stageSelect.value : null;
      begin(selected, false);
    });
  }

  // 面の選択が変わったらエディタ連携バッジを更新
  if (stageSelect) {
    stageSelect.addEventListener("change", updateEditorBadge);
  }

  // エディタ連携マップのリセット（元のマップに戻す）
  if (editorResetBtn) {
    editorResetBtn.addEventListener("click", () => {
      const selected = stageSelect ? stageSelect.value : "stage1";
      if (confirm("エディタで編集したマップデータをリセットして、元のマップに戻しますか？")) {
        if (window.RiikoGame.clearEditedMap) {
          window.RiikoGame.clearEditedMap(selected);
        }
        updateEditorBadge();
      }
    });
  }

  // 最初からやりなおす（1面）
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      window.RiikoGame.eraseSave();
      begin(window.FIRST_STAGE || "stage1", false);
    });
  }

  // ゲーム中からタイトル画面へもどる
  if (titleBtn) {
    titleBtn.addEventListener("click", () => {
      if (window.RiikoGame.stop) window.RiikoGame.stop();
      gate.style.display = "flex";
      showMenu();
    });
  }

  // BGM（音楽）のオン・オフ切り替え
  function updateSoundBtn() {
    if (!soundBtn) return;
    const on = window.RiikoGame && window.RiikoGame.bgm ? window.RiikoGame.bgm.isOn() : true;
    soundBtn.textContent = on ? "🎵" : "🔇";
    soundBtn.title = on ? "BGM: オン（タップで消音）" : "BGM: ミュート（タップで再生）";
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      if (window.RiikoGame && window.RiikoGame.bgm) {
        window.RiikoGame.bgm.toggle();
        updateSoundBtn();
      }
    });
  }

  // ===== バーチャルジョイスティック（スライドパッド） =====
  //   指で押したまま上下左右・斜めに自由に動かせる操作インターフェース
  function setDir(key, down) {
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { key: key })
    );
  }

  const joystick = document.getElementById("joystick");
  const knob = joystick ? joystick.querySelector(".joystick-knob") : null;
  const base = joystick ? joystick.querySelector(".joystick-base") : null;

  if (joystick && knob && base) {
    let activePointerId = null;
    let centerX = 0, centerY = 0;
    const MAX_DIST = 46; // 最大変位量（px）
    const DEAD_ZONE = 7; // 反応しない不感帯（微細なブレ防止）

    // 8方向キーシミュレーション状態（斜め入力にも対応）
    let activeSimKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    function syncSimKeys(sx, sy) {
      const threshold = 0.32;
      const next = {
        ArrowLeft: sx < -threshold,
        ArrowRight: sx > threshold,
        ArrowUp: sy < -threshold,
        ArrowDown: sy > threshold,
      };

      for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
        if (next[k] !== activeSimKeys[k]) {
          activeSimKeys[k] = next[k];
          setDir(k, next[k]);
        }
      }
    }

    function updateStick(clientX, clientY) {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < DEAD_ZONE) {
        knob.style.transform = "translate(0px, 0px)";
        if (window.RiikoGame && window.RiikoGame.setStick) {
          window.RiikoGame.setStick(0, 0);
        }
        syncSimKeys(0, 0);
        return;
      }

      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, MAX_DIST);
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      knob.style.transform = `translate(${knobX.toFixed(1)}px, ${knobY.toFixed(1)}px)`;

      // 正規化ベクトル（-1.0 〜 +1.0）
      const norm = clampedDist / MAX_DIST;
      const sx = Math.cos(angle) * norm;
      const sy = Math.sin(angle) * norm;

      if (window.RiikoGame && window.RiikoGame.setStick) {
        window.RiikoGame.setStick(sx, sy);
      }
      syncSimKeys(sx, sy);
    }

    function resetStick() {
      activePointerId = null;
      knob.classList.remove("active");
      knob.style.transform = "translate(0px, 0px)";
      if (window.RiikoGame && window.RiikoGame.setStick) {
        window.RiikoGame.setStick(0, 0);
      }
      syncSimKeys(0, 0);
    }

    joystick.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      try {
        joystick.setPointerCapture(e.pointerId);
      } catch (err) {}
      knob.classList.add("active");

      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;

      updateStick(e.clientX, e.clientY);
    });

    joystick.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      updateStick(e.clientX, e.clientY);
    });

    const onPointerEnd = (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      try {
        joystick.releasePointerCapture(e.pointerId);
      } catch (err) {}
      resetStick();
    };

    joystick.addEventListener("pointerup", onPointerEnd);
    joystick.addEventListener("pointercancel", onPointerEnd);
    joystick.addEventListener("lostpointercapture", resetStick);
  }

  // 旧.dbtn互換処理（テスト環境やフォールバック用）
  document.querySelectorAll(".dbtn").forEach((b) => {
    const key = b.getAttribute("data-dir");
    const pressOn = (ev) => {
      ev.preventDefault();
      b.classList.add("pressed");
      setDir(key, true);
    };
    const pressOff = () => {
      b.classList.remove("pressed");
      setDir(key, false);
    };
    b.addEventListener("pointerdown", pressOn);
    b.addEventListener("pointerup", pressOff);
    b.addEventListener("pointercancel", pressOff);
    b.addEventListener("pointerleave", pressOff);
    b.addEventListener("lostpointercapture", pressOff);
  });

  // 同じセッションのあいだは あいことばを もう一度きかない
  function sessionOk() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  // 起動時の初期化
  populateStageSelect();
  updateEditorBadge();
  updateSoundBtn();

  const params = typeof window !== "undefined" && window.location ? new URLSearchParams(window.location.search) : null;
  if (params && params.get("autostart") === "1") {
    begin(params.get("stage") || "stage1", false);
    const px = params.get("px"), py = params.get("py");
    if (px != null && py != null && window.RiikoGame && window.RiikoGame._test) {
      window.RiikoGame._test.state.player.x = Number(px);
      window.RiikoGame._test.state.player.y = Number(py);
      window.RiikoGame._test.state.cam.x = Number(px);
      window.RiikoGame._test.state.cam.y = Number(py);
    }
    const flag = params.get("flag");
    if (flag && window.RiikoGame && window.RiikoGame._test) {
      window.RiikoGame._test.state.flags[flag] = true;
    }
  } else if (sessionOk()) {
    showMenu();
  } else {
    showAuth();
  }
})();
