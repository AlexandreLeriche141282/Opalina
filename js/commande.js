(function () {
  var STORAGE_KEY = "opalina_commande";
  var SLOT_MINUTES = 30;
  var CUTOFF_HOUR = 17;

  var HOURS = {
    0: [{ start: "08:30", end: "18:00" }],
    1: [
      { start: "07:30", end: "10:30" },
      { start: "15:30", end: "18:30" }
    ],
    2: [
      { start: "07:30", end: "10:30" },
      { start: "15:30", end: "18:30" }
    ],
    3: [
      { start: "07:30", end: "10:30" },
      { start: "15:30", end: "18:30" }
    ],
    4: [
      { start: "07:30", end: "10:30" },
      { start: "15:30", end: "18:30" }
    ],
    5: [
      { start: "07:30", end: "10:30" },
      { start: "15:30", end: "18:30" }
    ],
    6: [{ start: "08:30", end: "18:00" }]
  };

  var MSG_SAME_DAY = "Le retrait le jour même n’est pas possible. Choisissez une date à partir du lendemain.";
  var MSG_AFTER_17 = "Après 17 h, le retrait du lendemain n’est plus proposé. Choisissez une date ultérieure.";

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getCart() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function itemKey(item) {
    return item.id + "|" + (item.variant || "");
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCart();
    updateBadge();
  }

  function labelOf(item) {
    return item.variantLabel ? item.name + " — " + item.variantLabel : item.name;
  }

  function addItem(entry) {
    var cart = getCart();
    var key = itemKey(entry);
    var existing = cart.find(function (item) {
      return itemKey(item) === key;
    });
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + entry.quantity);
    } else {
      cart.push(entry);
    }
    saveCart(cart);
    showToast(labelOf(entry) + " ajouté à la commande");
  }

  function changeQty(key, delta) {
    var cart = getCart();
    var next = [];
    cart.forEach(function (item) {
      if (itemKey(item) !== key) {
        next.push(item);
        return;
      }
      item.quantity += delta;
      if (item.quantity > 20) item.quantity = 20;
      if (item.quantity > 0) next.push(item);
    });
    saveCart(next);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toIso(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function startOfToday() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function afterCutoff() {
    return new Date().getHours() >= CUTOFF_HOUR;
  }

  function weekday(iso) {
    var parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (n) { return Number.isNaN(n); })) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  }

  function isToday(iso) {
    return iso === toIso(startOfToday());
  }

  function isTomorrow(iso) {
    var day = startOfToday();
    day.setDate(day.getDate() + 1);
    return iso === toIso(day);
  }

  function minimumIso() {
    var day = startOfToday();
    day.setDate(day.getDate() + (afterCutoff() ? 2 : 1));
    return toIso(day);
  }

  function isValidDate(iso) {
    if (!iso || isToday(iso)) return false;
    if (weekday(iso) == null) return false;
    if (iso < minimumIso()) return false;
    if (afterCutoff() && isTomorrow(iso)) return false;
    return true;
  }

  function minutes(hhmm) {
    var parts = hhmm.split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  function fromMinutes(total) {
    return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
  }

  function slotsFor(iso) {
    var day = weekday(iso);
    var ranges = HOURS[day] || [];
    var slots = [];
    ranges.forEach(function (range) {
      var cursor = minutes(range.start);
      var last = minutes(range.end);
      while (cursor <= last) {
        slots.push(fromMinutes(cursor));
        cursor += SLOT_MINUTES;
      }
    });
    return slots;
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function formatHour(hhmm) {
    return hhmm.replace(":", " h ");
  }

  function showFeedback(message) {
    var el = document.getElementById("order-feedback");
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function refreshDateField() {
    var input = document.getElementById("order-date");
    var cutoff = document.getElementById("order-cutoff");
    if (cutoff) cutoff.hidden = !afterCutoff();
    if (!input) return;
    input.min = minimumIso();
    if (input.value && !isValidDate(input.value)) input.value = "";
    fillTimes();
  }

  function fillTimes() {
    var dateInput = document.getElementById("order-date");
    var select = document.getElementById("order-time");
    if (!dateInput || !select) return;
    var previous = select.value;
    select.innerHTML = "";
    if (!dateInput.value) {
      select.disabled = true;
      select.innerHTML = "<option value=\"\">Choisissez d’abord une date</option>";
      return;
    }
    var slots = slotsFor(dateInput.value);
    select.disabled = false;
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = slots.length ? "Heure de retrait" : "Aucun créneau ce jour";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    slots.forEach(function (slot) {
      var option = document.createElement("option");
      option.value = slot;
      option.textContent = formatHour(slot);
      select.appendChild(option);
    });
    if (previous && slots.indexOf(previous) !== -1) select.value = previous;
  }

  function onDateChange() {
    var input = document.getElementById("order-date");
    if (!input) return;
    if (!input.value) {
      showFeedback("");
      fillTimes();
      return;
    }
    if (isToday(input.value)) {
      input.value = "";
      showFeedback(MSG_SAME_DAY);
      fillTimes();
      return;
    }
    if (afterCutoff() && isTomorrow(input.value)) {
      input.value = "";
      showFeedback(MSG_AFTER_17);
      fillTimes();
      return;
    }
    if (!isValidDate(input.value)) {
      input.value = "";
      showFeedback("Cette date de retrait n’est pas disponible.");
      fillTimes();
      return;
    }
    showFeedback("");
    fillTimes();
  }

  function buildRecap(notes, date, time, name, email, phone) {
    var lines = getCart().map(function (item) {
      return "– " + labelOf(item) + " × " + item.quantity;
    });
    var message = "Commande Opalina\n";
    message += "Retrait : " + formatDate(date) + " à " + formatHour(time) + "\n";
    message += "Nom : " + name + "\n";
    message += "E-mail : " + email + "\n";
    message += "Téléphone : " + phone + "\n\n";
    message += lines.join("\n");
    if (notes) message += "\n\nMessage : " + notes;
    message += "\n\nPrix confirmé en boutique. Règlement au retrait, aucun paiement en ligne.";
    return message;
  }

  function updateBadge() {
    var badge = document.querySelector(".cart-count");
    if (!badge) return;
    var count = getCart().reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  function renderCart() {
    var list = document.getElementById("order-items");
    var empty = document.getElementById("order-empty");
    var form = document.getElementById("order-form-wrap");
    if (!list) return;
    var cart = getCart();
    list.innerHTML = "";
    var isEmpty = cart.length === 0;
    if (empty) empty.hidden = !isEmpty;
    if (form) form.hidden = isEmpty;
    cart.forEach(function (item) {
      var key = itemKey(item);
      var li = document.createElement("li");
      li.className = "order-item";
      var thumb = item.image
        ? "<img src=\"" + escapeHtml(item.image) + "\" alt=\"\">"
        : "<span class=\"order-thumb-fallback\" aria-hidden=\"true\"></span>";
      li.innerHTML =
        thumb +
        "<div><p class=\"order-item-name\">" + escapeHtml(labelOf(item)) + "</p>" +
        "<p class=\"order-item-price\">Prix confirmé en boutique</p></div>" +
        "<div class=\"order-qty\">" +
        "<button type=\"button\" data-qty=\"-1\" data-key=\"" + escapeHtml(key) + "\" aria-label=\"Diminuer\">−</button>" +
        "<span>" + item.quantity + "</span>" +
        "<button type=\"button\" data-qty=\"1\" data-key=\"" + escapeHtml(key) + "\" aria-label=\"Augmenter\">+</button>" +
        "</div>" +
        "<button type=\"button\" class=\"order-remove\" data-remove=\"" + escapeHtml(key) + "\" aria-label=\"Retirer\">×</button>";
      list.appendChild(li);
    });
  }

  function showToast(text) {
    var toast = document.getElementById("order-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function setOpen(open) {
    var overlay = document.getElementById("order-overlay");
    var toggle = document.querySelector(".cart-toggle");
    if (!overlay) return;
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("order-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var label = toggle.querySelector(".sr-only");
      if (label) label.textContent = open ? "Fermer la commande" : "Ouvrir la commande";
    }
    if (open) {
      var nav = document.getElementById("site-nav");
      var navToggle = document.querySelector(".nav-toggle");
      if (nav) nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      if (navToggle) {
        navToggle.setAttribute("aria-expanded", "false");
        var navLabel = navToggle.querySelector(".sr-only");
        if (navLabel) navLabel.textContent = "Ouvrir le menu";
      }
      showForm();
      renderCart();
      refreshDateField();
      var close = overlay.querySelector(".order-close");
      if (close) close.focus();
    }
  }

  function showForm() {
    var success = document.getElementById("order-success");
    var flow = document.getElementById("order-flow");
    if (success) success.hidden = true;
    if (flow) flow.hidden = false;
  }

  function showSuccess(recap) {
    var success = document.getElementById("order-success");
    var flow = document.getElementById("order-flow");
    var pre = document.getElementById("order-recap");
    if (pre) pre.textContent = recap;
    if (flow) flow.hidden = true;
    if (success) success.hidden = false;
  }

  function readQuantity(card) {
    var input = card.querySelector(".order-qty-input");
    var quantity = parseInt(input && input.value, 10);
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    if (quantity > 20) quantity = 20;
    if (input) input.value = String(quantity);
    return quantity;
  }

  function bindCatalog() {
    document.querySelectorAll(".order-add").forEach(function (button) {
      button.addEventListener("click", function () {
        var card = button.closest(".order-card");
        if (!card) return;
        var title = card.querySelector("h3");
        if (!title) return;
        var variant = card.querySelector(".order-variant");
        var image = card.querySelector("img");
        addItem({
          id: card.getAttribute("data-id") || title.textContent.trim(),
          name: title.textContent.trim(),
          variant: variant ? variant.value : "",
          variantLabel: variant ? variant.options[variant.selectedIndex].text : "",
          quantity: readQuantity(card),
          image: image ? image.getAttribute("src") : ""
        });
      });
    });
  }

  function injectPanel() {
    if (document.getElementById("order-overlay")) return;
    var root = document.createElement("div");
    root.innerHTML =
      "<div id=\"order-toast\" class=\"order-toast\" aria-live=\"polite\"></div>" +
      "<div id=\"order-overlay\" class=\"order-overlay\" aria-hidden=\"true\">" +
      "<div id=\"order-panel\" class=\"order-panel\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"order-title\">" +
      "<button type=\"button\" class=\"order-close\" aria-label=\"Fermer\">×</button>" +
      "<div id=\"order-flow\">" +
      "<p class=\"kicker\">Retrait en boutique</p>" +
      "<h2 id=\"order-title\">Votre commande</h2>" +
      "<p id=\"order-empty\" class=\"order-empty\">La commande est vide. Choisissez une pièce sur la page Commander.</p>" +
      "<ul id=\"order-items\" class=\"order-items\"></ul>" +
      "<div id=\"order-form-wrap\" hidden>" +
      "<form id=\"order-form\">" +
      "<label for=\"order-name\">Nom et prénom</label>" +
      "<input id=\"order-name\" name=\"nom\" type=\"text\" required autocomplete=\"name\" placeholder=\"Votre nom\">" +
      "<label for=\"order-email\">E-mail</label>" +
      "<input id=\"order-email\" name=\"email\" type=\"email\" required autocomplete=\"email\" placeholder=\"Votre e-mail\">" +
      "<label for=\"order-phone\">Téléphone</label>" +
      "<input id=\"order-phone\" name=\"telephone\" type=\"tel\" required autocomplete=\"tel\" placeholder=\"Votre téléphone\">" +
      "<p class=\"order-notice\">Le retrait le jour même n’est pas possible. <span id=\"order-cutoff\" hidden>Après 17 h, le lendemain n’est plus proposé.</span> Les créneaux suivent les horaires annoncés à l’ouverture.</p>" +
      "<p id=\"order-feedback\" class=\"order-feedback\" role=\"alert\" hidden></p>" +
      "<label for=\"order-date\">Date de retrait</label>" +
      "<input id=\"order-date\" name=\"date\" type=\"date\" required>" +
      "<label for=\"order-time\">Heure de retrait</label>" +
      "<select id=\"order-time\" name=\"heure\" required disabled><option value=\"\">Choisissez d’abord une date</option></select>" +
      "<label for=\"order-notes\">Message</label>" +
      "<textarea id=\"order-notes\" name=\"message\" rows=\"4\" placeholder=\"Allergies, occasion, précision sur la pièce…\"></textarea>" +
      "<label class=\"order-check\"><input id=\"order-consent\" type=\"checkbox\" required><span>J’accepte que ces informations servent à traiter ma demande. J’ai lu les <a href=\"mentions-legales.html\">mentions légales</a>.</span></label>" +
      "<p class=\"order-hold\">L’envoi vers la boutique n’est pas encore activé. La demande reste affichée ici, rien n’est transmis.</p>" +
      "<button class=\"btn btn-solid order-submit\" type=\"submit\">Préparer la demande</button>" +
      "</form></div></div>" +
      "<div id=\"order-success\" class=\"order-success\" hidden>" +
      "<p class=\"kicker\">Aperçu</p>" +
      "<h2>Demande prête</h2>" +
      "<p>Rien n’a été envoyé. Voici le texte qui partira vers la boutique quand l’e-mail sera branché.</p>" +
      "<pre id=\"order-recap\" class=\"order-recap\"></pre>" +
      "<button type=\"button\" class=\"btn btn-ghost\" data-back-order>Revenir à la commande</button>" +
      "</div></div></div>";
    document.body.appendChild(root);

    document.querySelector(".order-close").addEventListener("click", function () {
      setOpen(false);
    });
    document.getElementById("order-overlay").addEventListener("click", function (event) {
      if (event.target.id === "order-overlay") setOpen(false);
    });
    document.getElementById("order-items").addEventListener("click", function (event) {
      var qty = event.target.closest("[data-qty]");
      if (qty) {
        changeQty(qty.getAttribute("data-key"), Number(qty.getAttribute("data-qty")));
        return;
      }
      var remove = event.target.closest("[data-remove]");
      if (remove) changeQty(remove.getAttribute("data-remove"), -100);
    });
    var dateInput = document.getElementById("order-date");
    if (dateInput) {
      dateInput.addEventListener("input", onDateChange);
      dateInput.addEventListener("change", onDateChange);
    }
    document.getElementById("order-form").addEventListener("submit", function (event) {
      event.preventDefault();
      if (!getCart().length) return;
      var date = document.getElementById("order-date").value;
      var time = document.getElementById("order-time").value;
      if (!isValidDate(date)) {
        var feedback = "Choisissez une date de retrait à partir du lendemain.";
        if (isToday(date)) feedback = MSG_SAME_DAY;
        else if (afterCutoff() && isTomorrow(date)) feedback = MSG_AFTER_17;
        showFeedback(feedback);
        document.getElementById("order-date").focus();
        refreshDateField();
        return;
      }
      if (!time || slotsFor(date).indexOf(time) === -1) {
        showFeedback("Choisissez une heure de retrait.");
        document.getElementById("order-time").focus();
        return;
      }
      showFeedback("");
      showSuccess(buildRecap(
        document.getElementById("order-notes").value.trim(),
        date,
        time,
        document.getElementById("order-name").value.trim(),
        document.getElementById("order-email").value.trim(),
        document.getElementById("order-phone").value.trim()
      ));
    });
    var back = document.querySelector("[data-back-order]");
    if (back) back.addEventListener("click", showForm);
  }

  document.querySelectorAll(".cart-toggle, [data-open-order]").forEach(function (button) {
    button.addEventListener("click", function () {
      var overlay = document.getElementById("order-overlay");
      setOpen(!(overlay && overlay.classList.contains("is-open")));
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });

  injectPanel();
  bindCatalog();
  updateBadge();
  renderCart();
  refreshDateField();
})();
