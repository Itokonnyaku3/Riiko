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

  const STORAGE_KEY = "riiko_ok";

  // ゲーム開始
  function begin(stageId, cont) {
    gate.style.display = "none";
    window.RiikoGame.start(stageId || null, { continue: !!cont });
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
  }

  // 認証画面の表示
  function showAuth() {
    if (authArea) authArea.classList.remove("hidden");
    if (menuArea) menuArea.classList.add("hidden");
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

  // ===== ほうこうボタン（バーチャルキー） =====
  //   ボタンを おすと、キーボードと同じ しくみで 主人公が うごきます。
  function setDir(key, down) {
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { key: key })
    );
  }

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
    // 指がすべって外れたときの保険
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

  if (sessionOk()) {
    showMenu();
  } else {
    showAuth();
  }
})();
