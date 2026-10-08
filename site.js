/* Debrief — сайт: язык RU/EN, шапка, появление блоков, подсказка после «Скачать». Без внешних библиотек. */
(function () {
  var TITLES = window.CC_TITLES || {};
  function store(v) { try { if (v) localStorage.setItem("cc_lang", v); return localStorage.getItem("cc_lang"); } catch (e) { return null; } }
  function guess() {
    var q = /[?&]lang=(ru|en)\b/.exec(location.search);
    if (q) return q[1];
    var s = store();
    if (s === "ru" || s === "en") return s;
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return /^(ru|uk|be|kk)\b/i.test(l) ? "ru" : "en";
  }
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
    try { document.dispatchEvent(new Event("cc-lang")); } catch (e) {}     // новости перерисуют даты и подписи
  };
  apply(guess());
  document.documentElement.classList.add("js");

  document.addEventListener("DOMContentLoaded", function () {
    apply(document.documentElement.lang);
    var bs = document.querySelectorAll(".lang button");
    for (var i = 0; i < bs.length; i++) bs[i].addEventListener("click", function () { window.ccLang(this.getAttribute("data-l")); });

    var top = document.querySelector(".top");
    function sc() { if (top) top.classList.toggle("sc", window.scrollY > 8); }
    window.addEventListener("scroll", sc, { passive: true }); sc();

    var dl = document.querySelectorAll("[data-dl]");
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
    var DL = null;
    function fill(sel, v) { var e = document.querySelectorAll('[data-dl="' + sel + '"]'); for (var i = 0; i < e.length; i++) e[i].textContent = v; }
    if (window.fetch && document.querySelector("[data-dl]")) {
      fetch("download.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !/^[0-9a-f]{64}$/.test(String(d.sha256 || ""))) return;
        DL = d;
        fill("ver", String(d.version || "").replace(/^v/, ""));
        fill("sha", d.sha256.toUpperCase());     // Get-FileHash показывает заглавными — так проще сравнить
        var mb = Number(d.size) / 1048576;
        if (mb > 0) fill("size", (document.documentElement.lang === "ru" ? mb.toFixed(1).replace(".", ",") + " МБ" : mb.toFixed(1) + " MB"));
      }).catch(function () {});
    }
    var cp = document.querySelectorAll("[data-copy]");
    for (var c = 0; c < cp.length; c++) cp[c].addEventListener("click", function () {
      var b = this, v = DL && DL.sha256 && DL.sha256.toUpperCase();
      if (!v || !navigator.clipboard) return;
      navigator.clipboard.writeText(v).then(function () { b.classList.add("ok"); setTimeout(function () { b.classList.remove("ok"); }, 1500); });
    });

    var rv = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) { for (var k = 0; k < rv.length; k++) rv[k].classList.add("in"); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    for (var m = 0; m < rv.length; m++) io.observe(rv[m]);
  });
})();
