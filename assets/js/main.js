/* =========================================================
   Momo's Hunt — site behaviour
   ========================================================= */

/* ---------------------------------------------------------
   1. EDIT ME — paste your delivery links here.
      Leave a value as "" and the button shows a
      "link coming soon" message instead of going nowhere.
   --------------------------------------------------------- */
const ORDER_LINKS = {
  doordash: "",   // e.g. "https://www.doordash.com/store/momos-hunt-granville/"
  ubereats: ""    // e.g. "https://www.ubereats.com/au/store/momos-hunt/xxxxx"
};

/* WhatsApp number that receives orders (digits only, with country code) */
const WHATSAPP_NUMBER = "61405140747";

/* Opening hours, 24h, keyed by JS day number (0 = Sunday).
   The kitchen runs past midnight, so a closing time earlier than the
   opening time means "the small hours of the next day". */
const HOURS = {
  0: ["13:00", "02:00"],
  1: ["13:00", "02:00"],
  2: ["13:00", "02:00"],
  3: ["13:00", "02:00"],
  4: ["13:00", "02:00"],
  5: ["13:00", "02:00"],
  6: ["14:00", "02:00"]
};

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================================================
   Toast
   ========================================================= */
const toastEl = $("#toast");
let toastTimer;

function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
}

/* =========================================================
   Delivery buttons
   ========================================================= */
$$("[data-order]").forEach((btn) => {
  const url = ORDER_LINKS[btn.dataset.order];
  if (url) {
    btn.href = url;
    btn.target = "_blank";
    btn.rel = "noopener";
  } else {
    btn.classList.add("is-pending");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toast("Delivery link coming soon — call us on +61 405 140 747.");
    });
  }
});

/* =========================================================
   Open / closed badge (restaurant local time: Sydney)
   ========================================================= */
function sydneyNow() {
  // Read the wall clock in Sydney regardless of the visitor's timezone.
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const get = (t) => parts.find((p) => p.type === t)?.value ?? "0";
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parseInt(get("hour"), 10) % 24;

  return {
    day: days[get("weekday")] ?? new Date().getDay(),
    minutes: hour * 60 + parseInt(get("minute"), 10)
  };
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const pretty = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
};

/* A day's trading window, in minutes from midnight of that day.
   Past-midnight closings run over 1440. */
function windowFor(day) {
  const [openStr, closeStr] = HOURS[day];
  const open = toMinutes(openStr);
  let close = toMinutes(closeStr);
  if (close <= open) close += 1440;
  return { open, close, closeStr };
}

function renderStatus() {
  const el = $("#status");
  if (!el) return;

  const { day, minutes } = sydneyNow();
  const text = $(".status__text", el);

  const today = windowFor(day);
  /* Yesterday's session may still be running in the small hours. */
  const carry = windowFor((day + 6) % 7);
  let live = null;

  if (minutes >= today.open && minutes < today.close) {
    live = today;
  } else if (carry.close > 1440 && minutes < carry.close - 1440) {
    live = { open: carry.open - 1440, close: carry.close - 1440, closeStr: carry.closeStr };
  }

  el.classList.remove("is-open", "is-closed");

  if (live) {
    el.classList.add("is-open");
    const left = live.close - minutes;
    text.textContent = left <= 60
      ? `Open now · last orders in ${left} min`
      : `Open now · closes ${pretty(live.closeStr)}`;
  } else {
    el.classList.add("is-closed");
    const opensToday = minutes < today.open;
    const nextOpen = HOURS[opensToday ? day : (day + 1) % 7][0];
    text.textContent = opensToday
      ? `Closed · opens ${pretty(nextOpen)} today`
      : `Closed · opens ${pretty(nextOpen)} tomorrow`;
  }

  // Highlight today's row in the hours table
  $$(".hours__row[data-days]").forEach((row) => {
    const days = row.dataset.days.split(",").map(Number);
    row.classList.toggle("is-today", days.includes(day));
  });
}

renderStatus();
setInterval(renderStatus, 60000);

/* =========================================================
   Menu category tabs
   ========================================================= */
const tabs = $$(".tab");
const menuNodes = $$("#menu-list > *");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });

    const cat = tab.dataset.cat;
    menuNodes.forEach((node) => {
      node.style.display = cat === "all" || node.dataset.cat === cat ? "" : "none";
    });
  });
});

/* =========================================================
   Order builder (cart)
   ========================================================= */
const CART_KEY = "momoshunt.cart.v1";
let cart = [];

try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
} catch (_) {
  cart = [];
}

const orderbar   = $("#orderbar");
const stickybar  = $("#stickybar");
const cartPanel  = $("#cart-panel");
const cartToggle = $("#cart-toggle");
const cartLines  = $("#cart-lines");
const money = (n) => `$${n.toFixed(2)}`;

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (_) {
    /* private browsing — the cart just won't persist */
  }
}

function addToCart(name, price) {
  const line = cart.find((l) => l.name === name);
  if (line) line.qty += 1;
  else cart.push({ name, price, qty: 1 });
  saveCart();
  renderCart();
}

function changeQty(name, delta) {
  const line = cart.find((l) => l.name === name);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((l) => l.name !== name);
  saveCart();
  renderCart();
}

function orderMessage() {
  const lines = cart.map((l) => `• ${l.qty} × ${l.name} — ${money(l.price * l.qty)}`);
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  return [
    "Namaste Momo's Hunt! I'd like to order:",
    "",
    ...lines,
    "",
    `Total: ${money(total)}`,
    "",
    "Name:",
    "Pick-up or delivery:",
    "Time:"
  ].join("\n");
}

function renderCart() {
  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const empty = count === 0;

  orderbar.classList.toggle("is-hidden", empty);
  stickybar.classList.toggle("is-hidden", !empty);

  $("#cart-count").textContent = count;
  $("#cart-total").textContent = money(total);
  cartToggle.querySelector(".orderbar__label").textContent =
    count === 1 ? "1 item" : `${count} items`;

  cartLines.innerHTML = "";
  cart.forEach((line) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = line.name;

    const qty = document.createElement("span");
    qty.className = "cart__qty";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Remove one ${line.name}`);
    minus.addEventListener("click", () => changeQty(line.name, -1));

    const qtyLabel = document.createElement("b");
    qtyLabel.textContent = line.qty;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Add one ${line.name}`);
    plus.addEventListener("click", () => changeQty(line.name, 1));

    qty.append(minus, qtyLabel, plus);

    const lineTotal = document.createElement("span");
    lineTotal.className = "cart__line-total";
    lineTotal.textContent = money(line.price * line.qty);

    li.append(name, qty, lineTotal);
    cartLines.append(li);
  });

  $("#send-order").href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;

  if (empty) {
    cartPanel.hidden = true;
    cartToggle.setAttribute("aria-expanded", "false");
  }
}

$$(".mitem .add").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".mitem");
    addToCart(item.dataset.name, parseFloat(item.dataset.price));
    item.classList.remove("is-added");
    void item.offsetWidth; // restart the flash animation
    item.classList.add("is-added");
    toast(`${item.dataset.name} added`);
  });
});

cartToggle.addEventListener("click", () => {
  const open = cartPanel.hidden;
  cartPanel.hidden = !open;
  cartToggle.setAttribute("aria-expanded", String(open));
});

$("#cart-clear").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  toast("Order cleared");
});

renderCart();

/* =========================================================
   Gallery photo rail
   A horizontal strip of cards: hover pops a card out,
   click opens the full-size photo.
   ========================================================= */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rail      = $("#gallery-rail");
const railTrack = $("#rail-track");
const railPrev  = $("#rail-prev");
const railNext  = $("#rail-next");
const shotCards = $$(".shot__card", rail);

/* One card plus the gap between cards. */
function railStep() {
  const card = $(".shot", railTrack);
  if (!card) return railTrack.clientWidth * 0.8;
  const gap = parseFloat(getComputedStyle(railTrack).columnGap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function railScroll(dir) {
  railTrack.scrollBy({ left: dir * railStep(), behavior: "smooth" });
}

railPrev.addEventListener("click", () => railScroll(-1));
railNext.addEventListener("click", () => railScroll(1));

/* Grey out an arrow once that end is reached. */
function syncRailNav() {
  const max = railTrack.scrollWidth - railTrack.clientWidth - 2;
  railPrev.disabled = railTrack.scrollLeft <= 2;
  railNext.disabled = railTrack.scrollLeft >= max;
}
railTrack.addEventListener("scroll", syncRailNav, { passive: true });
window.addEventListener("resize", syncRailNav);
syncRailNav();

/* --- full-size view --- */
const lightbox = $("#lightbox");
const lbImg = $("#lb-img");

function openLightbox(card) {
  const img = $(".shot__photo", card);
  lbImg.src = card.dataset.full || img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  $("#lb-close").focus();
}

shotCards.forEach((card) => {
  card.addEventListener("click", () => openLightbox(card));
});

function closeLightbox() {
  lightbox.hidden = true;
  lbImg.src = "";
  document.body.style.overflow = "";
}
$("#lb-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

/* =========================================================
   Nav highlighting + reveal on scroll
   ========================================================= */
const navLinks = $$(".nav a");
const sections = navLinks
  .map((link) => $(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((section) => spy.observe(section));
}

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealTargets = [
    ...$$(".pick"),
    ...$$(".sechead"),
    ...$$(".trays li"),
    ...$$(".visit > *")
  ];
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
      entry.target.classList.add("is-in");
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  revealTargets.forEach((el) => revealer.observe(el));

  // Safety net: nothing stays invisible if the observer never fires
  // (print, screenshot tools, an unusual scroll container).
  setTimeout(() => {
    revealTargets.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.2) {
        el.classList.add("is-in");
      }
    });
  }, 1800);
  window.addEventListener("beforeprint", () =>
    revealTargets.forEach((el) => el.classList.add("is-in"))
  );
}

/* Footer year */
$("#year").textContent = new Date().getFullYear();
