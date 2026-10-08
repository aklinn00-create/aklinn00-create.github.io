/* Debrief — новости на сайте (08.10.2026). Сервер Debrief (Google Apps Script, ?action=news) раз в 30 минут сам собирает
   заголовки: HLTV (через Google Новости), обновления CS2 от Valve (Steam) и русскоязычные новости CS2 — без букмекеров.
   «Debrief» — карточка версии из download.json (его пишет программа при рассылке обновления).
   Всё выводится только текстом (textContent), ссылки — только https: чужая лента не может вставить код на сайт. */
(function () {
  var API = "https://script.google.com/macros/s/AKfycbxrlfwa3VjcGQWmihtXFJHspo41cj9kUOwDA6Tf7HiNuH2rguVUusC3ydCVhDn1c7Eu/exec";
  var NAMES = { hltv: ["HLTV", "HLTV"], valve: ["Обновления CS2", "CS2 updates"], ru: ["На русском", "In Russian"],
                debrief: ["Debrief", "Debrief"] };
  var ALL = [], FILTER = "all";

  function L() { return document.documentElement.lang === "en" ? 1 : 0; }
  function ago(iso) {
    var t = Date.parse(iso); if (!t) return "";
    var m = Math.max(1, Math.round((Date.now() - t) / 60000)), h = Math.round(m / 60), d = Math.round(h / 24);
    if (L()) return m < 60 ? m + " min ago" : h < 24 ? h + " h ago" : d === 1 ? "yesterday" : d + " days ago";
    if (m < 60) return m + " мин назад";
    if (h < 24) return h + " ч назад";
    if (d === 1) return "вчера";
    return new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safeUrl(u) { return /^https:\/\/[^\s"'<>]+$/.test(String(u || "")) ? String(u) : ""; }

  function card(x) {
    var a = el("article", "ncard f-" + x.f);
    var meta = el("div", "nmeta");
    meta.appendChild(el("span", "nsrc", x.f === "valve" ? "Valve" : x.s || (NAMES[x.f] || ["", ""])[L()]));
    if (x.f === "valve" || x.f === "ru") meta.appendChild(el("span", "ntag", NAMES[x.f][L()]));   // у HLTV/Debrief метка = источник
    var when = x.f === "debrief" ? new Date(Date.parse(x.d) || Date.now()).toLocaleDateString(L() ? "en-US" : "ru-RU",
      { day: "numeric", month: "long" }) : ago(x.d);                 // у версии — дата выхода, время неизвестно
    var tm = el("time", "", when); tm.dateTime = x.d; meta.appendChild(tm);
    a.appendChild(meta);
    var h = el("h3", "ntitle");
    if (x.f === "debrief") {
      var ia = el("a", "", x.t); ia.href = "index.html"; h.appendChild(ia);
    } else {
      var u = safeUrl(x.u);
      if (!u) return null;
      var la = el("a", "", x.t); la.href = u; la.target = "_blank"; la.rel = "noopener noreferrer nofollow"; h.appendChild(la);
    }
    a.appendChild(h);
    if (x.list && x.list.length) {
      var ul = el("ul", "nlist");
      x.list.slice(0, 6).forEach(function (s) { ul.appendChild(el("li", "", s)); });
      a.appendChild(ul);
    } else if (x.x) a.appendChild(el("p", "nx", x.x));
    if (x.f !== "debrief") a.appendChild(el("span", "nmore", L() ? "Read at the source →" : "Читать у источника →"));
    return a;
  }

  function debriefItem(d) {
    if (!d || !d.version) return null;
    var ver = String(d.version).replace(/^v/, ""), n = d.notes || {};
    return { f: "debrief", s: "Debrief", d: (d.date || "") + "T12:00:00Z",
             t: L() ? "Debrief " + ver + " is out" : "Вышла версия Debrief " + ver,
             list: (L() ? n.en : n.ru) || [] };
  }

  function teaserPick(items) {        // на главной — по одной свежей из каждой ленты (русским — сначала русская)
    var order = L() ? ["hltv", "valve", "ru"] : ["ru", "hltv", "valve"], out = [];
    order.forEach(function (f) { var x = items.filter(function (i) { return i.f === f; })[0]; if (x) out.push(x); });
    items.forEach(function (x) { if (out.length < 3 && x.f !== "debrief" && out.indexOf(x) < 0) out.push(x); });
    return out.slice(0, 3);
  }

  function render() {
    var lst = document.getElementById("news-list"), teaser = document.getElementById("news-teaser");
    var items = ALL.slice(), di = debriefItem(window.__dl);
    if (di) items.unshift(di);                      // свежая версия программы — первой карточкой
    [lst, teaser].forEach(function (box) {
      if (!box) return;
      box.textContent = "";
      var pool = box === teaser ? teaserPick(items)
                                : items.filter(function (x) { return FILTER === "all" || x.f === FILTER; });
      var n = 0;
      pool.forEach(function (x) { var c = x && card(x); if (c) { box.appendChild(c); n++; } });
      if (!n) box.appendChild(el("p", "nempty", L() ? "No news right now — check back a bit later." : "Пока новостей нет — загляни чуть позже."));
    });
    var bs = document.querySelectorAll("#news-filter [data-f]");
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute("aria-pressed", String(bs[i].getAttribute("data-f") === FILTER));
  }

  function load() {
    if (!document.getElementById("news-list") && !document.getElementById("news-teaser")) return;
    var news = fetch(API + "?action=news").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var dl = fetch("download.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    Promise.all([news, dl]).then(function (res) {
      var items = (res[0] && res[0].items) || [];
      ALL = items.filter(function (x) { return x && typeof x.t === "string" && x.f !== "debrief" && NAMES[x.f]; });
      window.__dl = res[1];
      var up = document.getElementById("news-updated");
      if (up && res[0] && res[0].updated) up.textContent = (L() ? "Updated " : "Обновлено ") + ago(res[0].updated);
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var bs = document.querySelectorAll("#news-filter [data-f]");
    for (var i = 0; i < bs.length; i++) bs[i].addEventListener("click", function () { FILTER = this.getAttribute("data-f"); render(); });
    load();
  });
  document.addEventListener("cc-lang", render);      // переключили RU/EN — перерисовать подписи и даты
})();
