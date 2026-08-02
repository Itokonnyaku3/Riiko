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
  const input = document.getElementById("gate-input");
  const btn = document.getElementById("gate-btn");
  const newBtn = document.getElementById("gate-new");
  const errEl = document.getElementById("gate-error");

  const STORAGE_KEY = "riiko_ok";

  // つづきが あるなら「つづきから」、なければ さいしょから
  function begin(fresh) {
    gate.style.display = "none";
    window.RiikoGame.start(null, { continue: !fresh });
  }

  // つづきが ある ときだけ「さいしょから」を 出す
  function refreshButtons() {
    const has = window.RiikoGame.hasSave();
    btn.textContent = has ? "つづきから" : "スタート";
    if (newBtn) newBtn.classList.toggle("hidden", !has);
  }

  if (newBtn) {
    newBtn.addEventListener("click", () => {
      const val = (input.value || "").trim().toLowerCase();
      const okAlready = sessionOk();
      if (!okAlready && val !== String(GAME_CONFIG.password).toLowerCase()) {
        errEl.textContent = "あいことばを 入れてね";
        input.focus();
        return;
      }
      window.RiikoGame.eraseSave();
      begin(true);
    });
  }

  function tryPassword() {
    const val = (input.value || "").trim().toLowerCase();
    if (val === String(GAME_CONFIG.password).toLowerCase()) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {}
      begin();
    } else {
      errEl.textContent = "あいことばが ちがうよ";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", tryPassword);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryPassword();
  });

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

  refreshButtons();
  if (sessionOk()) {
    begin();
  } else {
    setTimeout(() => input.focus(), 200);
  }
})();
