/* Debrief — сайт: язык RU/EN, шапка, появление блоков, подсказка после «Скачать». Без внешних библиотек.
   Встроенных скриптов на страницах нет (защита CSP: script-src 'self') — заголовки RU/EN берутся из <meta name="cc-title">. */
(function () {
  var REPO = "https://api.github.com/repos/aklinn00-create/cs2-reports/releases/tags/app";
  var SETUP = "CS2Coach_Setup.exe";
  var DLC_MIN = 100;                      // счётчик скачиваний показываем, когда их наберётся хотя бы столько
  function metaTitles() {
    var m = document.querySelector('meta[name="cc-title"]');
    return m ? { ru: m.getAttribute("data-ru"), en: m.getAttribute("data-en") } : {};
  }
  var TITLES = window.CC_TITLES || metaTitles();
  function store(v) { try { if (v) localStorage.setItem("cc_lang", v); return localStorage.getItem("cc_lang"); } catch (e) { return null; } }
  function guess() {
    var q = /[?&]lang=(ru|en)\b/.exec(location.search);
    if (q) return q[1];
    var s = store();
    if (s === "ru" || s === "en") return s;
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return /^(ru|uk|be|kk)\b/i.test(l) ? "ru" : "en";
  }
  function L() { return document.documentElement.lang === "en"; }
  function apply(v) {
    document.documentElement.lang = v;
    if (TITLES[v]) document.title = TITLES[v];
    var d = document.querySelector('meta[name="description"]');
    if (d && d.getAttribute("data-" + v)) d.setAttribute("content", d.getAttribute("data-" + v));
    var bs = document.querySelectorAll(".lang button");
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute("aria-pressed", String(bs[i].getAttribute("data-l") === v));
  }
  window.ccLang = function (v) {
    store(v); apply(v);
    try { document.dispatchEvent(new Event("cc-lang")); } catch (e) {}     // новости и счётчик перерисуют подписи
  };
  apply(guess());
  document.documentElement.classList.add("js");

  function fill(sel, v) { var e = document.querySelectorAll('[data-dl="' + sel + '"]'); for (var i = 0; i < e.length; i++) e[i].textContent = v; }
  function getJSON(url, opt) {
    return window.fetch ? fetch(url, opt).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
                        : Promise.resolve(null);
  }
  function verNum(v) { return String(v || "").replace(/^v/, "").split(".").map(function (x) { return parseInt(x, 10) || 0; }); }
  function newer(a, b) {           // версия a новее b?
    var x = verNum(a), y = verNum(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  document.addEventListener("DOMContentLoaded", function () {
    apply(document.documentElement.lang);
    var bs = document.querySelectorAll(".lang button");
    for (var i = 0; i < bs.length; i++) bs[i].addEventListener("click", function () { window.ccLang(this.getAttribute("data-l")); });

    var top = document.querySelector(".top");
    function sc() { if (top) top.classList.toggle("sc", window.scrollY > 8); }
    window.addEventListener("scroll", sc, { passive: true }); sc();

    var dl = document.querySelectorAll("a[data-dl]");
    for (var j = 0; j < dl.length; j++) dl[j].addEventListener("click", function () {
      var n = document.getElementById(this.getAttribute("data-dl"));
      if (n) n.classList.add("on");
    });

    // ссылки «проверить подлинность» раскрывают вопрос в FAQ
    function openQ(id) { var d = document.getElementById(id); if (d && d.tagName === "DETAILS") d.open = true; }
    var op = document.querySelectorAll("[data-open]");
    for (var o = 0; o < op.length; o++) op[o].addEventListener("click", function () { openQ(this.getAttribute("data-open")); });
    if (location.hash) openQ(location.hash.slice(1));

    // версия, размер и SHA-256 текущего установщика: download.json пишет сама программа при «Разослать обновление»
    var DL = null, COUNT = null;
    var needDL = document.querySelector("[data-dl],[data-dlc],#changelog");
    var dlP = needDL ? getJSON("download.json?t=" + Date.now(), { cache: "no-store" }) : Promise.resolve(null);
    dlP.then(function (d) {
      if (!d || !/^[0-9a-f]{64}$/.test(String(d.sha256 || ""))) return;
      DL = d;
      fill("ver", String(d.version || "").replace(/^v/, ""));
      fill("sha", d.sha256.toUpperCase());     // Get-FileHash показывает заглавными — так проще сравнить
      sizes();
      latestVersion();
    });
    function sizes() {
      var mb = DL ? Number(DL.size) / 1048576 : 0;
      if (mb > 0) fill("size", L() ? mb.toFixed(1) + " MB" : mb.toFixed(1).replace(".", ",") + " МБ");
    }
    var cp = document.querySelectorAll("[data-copy]");
    for (var c = 0; c < cp.length; c++) cp[c].addEventListener("click", function () {
      var b = this, v = DL && DL.sha256 && DL.sha256.toUpperCase();
      if (!v || !navigator.clipboard) return;
      navigator.clipboard.writeText(v).then(function () { b.classList.add("ok"); setTimeout(function () { b.classList.remove("ok"); }, 1500); });
    });

    // счётчик скачиваний: GitHub считает скачивания файла, а файл при каждом выпуске заменяется — прежние копит dl_base
    var dlc = document.querySelector("[data-dlc]");
    function showCount() {
      if (!dlc || COUNT == null || COUNT < DLC_MIN) return;
      var n = dlc.querySelector("[data-dlc-n]");
      if (n) n.textContent = COUNT.toLocaleString(L() ? "en-US" : "ru-RU");
      dlc.hidden = false;
    }
    if (dlc) {
      var cached = null;
      try { cached = JSON.parse(sessionStorage.getItem("cc_dlc") || "null"); } catch (e) {}
      var ghP = cached && Date.now() - cached.t < 600000 ? Promise.resolve(cached.n)
        : getJSON(REPO).then(function (r) {
            var a = r && r.assets ? r.assets.filter(function (x) { return x.name === SETUP; })[0] : null;
            var n = a ? Number(a.download_count) || 0 : null;
            try { if (n != null) sessionStorage.setItem("cc_dlc", JSON.stringify({ t: Date.now(), n: n })); } catch (e) {}
            return n;
          });
      Promise.all([dlP, ghP]).then(function (res) {
        if (res[1] == null) return;
        COUNT = (Number(res[0] && res[0].dl_base) || 0) + res[1];
        showCount();
      });
    }

    // «История версий»: страница уже содержит выпущенные версии; вышла новее — берём её из download.json
    function latestVersion() {
      var box = document.getElementById("changelog");
      if (!box || !DL || !DL.version) return;
      var first = box.querySelector("[data-ver]");
      if (first && !newer(DL.version, first.getAttribute("data-ver"))) return;
      if (box.querySelector('[data-ver="' + DL.version + '"]')) return;
      var art = el("article", "rel");
      art.setAttribute("data-ver", DL.version);
      var h = el("h2", "", "Debrief " + String(DL.version).replace(/^v/, ""));
      var tm = el("time"), dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(DL.date || ""));
      if (dm && +dm[2] >= 1 && +dm[2] <= 12) {    // обе подписи, как у остальных версий: язык переключается без перерисовки
        var y = +dm[1], mo = +dm[2] - 1, dd = +dm[3];
        var MR = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
        var ME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        tm.dateTime = dm[0];
        var tr = el("span", "", dd + " " + MR[mo] + " " + y); tr.setAttribute("lang", "ru");
        var te = el("span", "", ME[mo] + " " + dd + ", " + y); te.setAttribute("lang", "en");
        tm.appendChild(tr); tm.appendChild(te);
      }
      var hd = el("div", "rel-h"); hd.appendChild(h); hd.appendChild(tm); art.appendChild(hd);
      [["ru", (DL.notes || {}).ru], ["en", (DL.notes || {}).en]].forEach(function (p) {
        if (!p[1] || !p[1].length) return;
        var ul = el("ul"); ul.setAttribute("lang", p[0]);
        p[1].forEach(function (s) { ul.appendChild(el("li", "", String(s))); });
        art.appendChild(ul);
      });
      box.insertBefore(art, box.firstChild);
    }

    // телефон: «Отправить ссылку себе на ПК» (программа только для Windows, а сайт часто открывают с телефона)
    var sh = document.querySelectorAll("[data-share]");
    var shareUrl = (document.querySelector('link[rel="canonical"]') || {}).href || location.origin + location.pathname;
    function shareResult(box, copied) {      // скопировали — «Ссылка скопирована»; нет доступа к буферу — показываем саму ссылку
      if (!box) return;
      var a = box.querySelectorAll("[data-ok]"), b = box.querySelectorAll("[data-fail]"), u = box.querySelector("[data-url]");
      for (var i = 0; i < a.length; i++) a[i].hidden = !copied;
      for (var k = 0; k < b.length; k++) b[k].hidden = copied;
      if (u) { u.textContent = shareUrl; u.hidden = copied; }
      box.hidden = false;
    }
    for (var s = 0; s < sh.length; s++) {
      sh[s].addEventListener("click", function () {
        var box = document.getElementById(this.getAttribute("data-share"));
        var text = L() ? "Debrief — CS2 demo review for Windows. Open on your PC to download:"
                       : "Debrief — разбор демок CS2 для Windows. Открой на компьютере, чтобы скачать:";
        var copy = function () {
          if (!navigator.clipboard || !window.isSecureContext) return shareResult(box, false);
          navigator.clipboard.writeText(shareUrl).then(function () { shareResult(box, true); }, function () { shareResult(box, false); });
        };
        if (navigator.share) {
          navigator.share({ title: "Debrief", text: text, url: shareUrl }).catch(function (e) { if (!e || e.name !== "AbortError") copy(); });
        } else copy();
      });
    }

    // ролик в «телефоне»: играет без звука, только когда виден на экране; «меньше анимации» — только по нажатию
    var vids = document.querySelectorAll("video[data-auto]");
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (vids.length) {
      if (still || !("IntersectionObserver" in window)) {
        for (var v = 0; v < vids.length; v++) vids[v].controls = true;
      } else {
        var vio = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            var vd = e.target;
            if (e.isIntersecting && !vd.ccStop) { var p = vd.play(); if (p && p.catch) p.catch(function () { vd.controls = true; }); }
            else vd.pause();
          });
        }, { threshold: 0.35 });
        // клик / Enter / Пробел — пауза и дальше (движущееся дольше 5 с должно останавливаться)
        var toggle = function (vd) { if (vd.paused) { vd.ccStop = false; vd.play(); } else { vd.ccStop = true; vd.pause(); } };
        for (var w = 0; w < vids.length; w++) {
          vids[w].muted = true;
          vids[w].tabIndex = 0;
          vids[w].addEventListener("click", function () { if (!this.controls) toggle(this); });
          vids[w].addEventListener("keydown", function (ev) {
            if (!this.controls && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); toggle(this); }
          });
          vio.observe(vids[w]);
        }
      }
    }

    document.addEventListener("cc-lang", function () { sizes(); showCount(); });

    var rv = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) { for (var k = 0; k < rv.length; k++) rv[k].classList.add("in"); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    for (var m = 0; m < rv.length; m++) io.observe(rv[m]);
  });
})();
