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
  window.ccLang = function (v) { store(v); apply(v); };
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

    var rv = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) { for (var k = 0; k < rv.length; k++) rv[k].classList.add("in"); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    for (var m = 0; m < rv.length; m++) io.observe(rv[m]);
  });
})();
