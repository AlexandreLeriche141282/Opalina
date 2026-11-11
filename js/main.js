(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  var header = document.querySelector(".site-header");
  var page = document.body.getAttribute("data-page");

  function setNav(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    var label = toggle.querySelector(".sr-only");
    if (label) label.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("is-open"));
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
  }

  if (page) {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.getAttribute("data-nav") === page) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var lines = [];
      data.forEach(function (value, key) {
        var text = String(value).trim();
        if (text) lines.push(key + " : " + text);
      });
      var subject = form.getAttribute("data-subject") || "Message depuis le site Opalina";
      var href =
        "mailto:opalinapatisserie@outlook.com?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));
      var note = form.querySelector(".form-status");
      if (note) note.hidden = false;
      window.location.href = href;
    });
  });
})();
