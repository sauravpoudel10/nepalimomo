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

/* Opening hours, 24h, keyed by JS day number (0 = Sunday) */
const HOURS = {
  0: ["11:00", "21:00"],
  1: ["11:00", "21:30"],
  2: ["11:00", "21:30"],
  3: ["11:00", "21:30"],
  4: ["11:00", "21:30"],
  5: ["11:00", "22:30"],
  6: ["11:00", "22:30"]
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

function renderStatus() {
  const el = $("#status");
  if (!el) return;

  const { day, minutes } = sydneyNow();
  const [openStr, closeStr] = HOURS[day];
  const open = toMinutes(openStr);
  const close = toMinutes(closeStr);
  const text = $(".status__text", el);

  el.classList.remove("is-open", "is-closed");

  if (minutes >= open && minutes < close) {
    el.classList.add("is-open");
    const left = close - minutes;
    text.textContent = left <= 60
      ? `Open now · last orders in ${left} min`
      : `Open now · closes ${pretty(closeStr)}`;
  } else {
    el.classList.add("is-closed");
    const nextDay = minutes < open ? day : (day + 1) % 7;
    const nextOpen = HOURS[nextDay][0];
    text.textContent = minutes < open
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
   Gallery story player
   Instagram-style: segmented progress bars, auto-advance,
   tap the sides to move, hold to pause.
   ========================================================= */

/* How long each photo holds, in seconds. */
const STORY_SECONDS = 5;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const story      = $("#story");
const storyFrame = $("#story-frame");
const barsWrap   = $("#story-bars");
const storySlides = $$(".story__slide", story);

let storyIdx = 0;
let userPaused = false;
let offScreen = true;
let held = false;

story.style.setProperty("--story-dur", `${STORY_SECONDS}s`);

/* --- progress bars, one per photo --- */
const bars = storySlides.map((slide, i) => {
  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "story__bar";
  bar.setAttribute("role", "tab");
  bar.setAttribute("aria-label", `Photo ${i + 1} of ${storySlides.length}`);
  bar.addEventListener("click", () => goStory(i));
  barsWrap.append(bar);
  return bar;
});

function updatePaused() {
  story.classList.toggle("is-paused", userPaused || offScreen || held);
}

function goStory(i) {
  storyIdx = (i + storySlides.length) % storySlides.length;

  storySlides.forEach((slide, n) => slide.classList.toggle("is-active", n === storyIdx));

  bars.forEach((bar, n) => {
    bar.classList.toggle("is-done", n < storyIdx);
    bar.classList.remove("is-active");
    bar.setAttribute("aria-selected", String(n === storyIdx));
  });

  // restart the fill animation on the bar that is now current
  const bar = bars[storyIdx];
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = "";
  bar.classList.add("is-active");
}

const nextStory = () => goStory(storyIdx + 1);
const prevStory = () => goStory(storyIdx - 1);

/* The bar's own animation ending is what advances the story, so pausing the
   animation pauses the story — one mechanism, nothing to keep in sync. */
barsWrap.addEventListener("animationend", (e) => {
  if (e.animationName === "storyFill" && e.target.classList.contains("is-active")) {
    nextStory();
  }
});

/* --- tap zones --- */
$("#zone-prev").addEventListener("click", () => { if (!held) prevStory(); });
$("#zone-next").addEventListener("click", () => { if (!held) nextStory(); });
$("#story-prev").addEventListener("click", prevStory);
$("#story-next").addEventListener("click", nextStory);

/* --- hold anywhere on the frame to pause --- */
let holdTimer;
storyFrame.addEventListener("pointerdown", () => {
  holdTimer = setTimeout(() => { held = true; updatePaused(); }, 220);
});
function releaseHold() {
  clearTimeout(holdTimer);
  if (!held) return;
  // let the click that follows fall through without changing photo
  setTimeout(() => { held = false; updatePaused(); }, 0);
}
storyFrame.addEventListener("pointerup", releaseHold);
storyFrame.addEventListener("pointercancel", releaseHold);
storyFrame.addEventListener("pointerleave", releaseHold);

/* --- explicit pause button (also covers keyboard users) --- */
const pauseBtn = $("#story-pause");
pauseBtn.addEventListener("click", () => {
  userPaused = !userPaused;
  pauseBtn.setAttribute("aria-pressed", String(userPaused));
  pauseBtn.setAttribute("aria-label", userPaused ? "Play the story" : "Pause the story");
  updatePaused();
});

/* --- keyboard --- */
storyFrame.tabIndex = 0;
storyFrame.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); nextStory(); }
  if (e.key === "ArrowLeft")  { e.preventDefault(); prevStory(); }
  if (e.key === " ")          { e.preventDefault(); pauseBtn.click(); }
});

/* --- swipe --- */
let swipeX = null;
storyFrame.addEventListener("touchstart", (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
storyFrame.addEventListener("touchend", (e) => {
  if (swipeX === null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  if (Math.abs(dx) > 45) dx < 0 ? nextStory() : prevStory();
  swipeX = null;
}, { passive: true });

/* --- only run while it is on screen --- */
if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => { offScreen = !entry.isIntersecting; });
    updatePaused();
  }, { threshold: 0.35 }).observe(story);
} else {
  offScreen = false;
}

document.addEventListener("visibilitychange", () => {
  offScreen = document.hidden;
  updatePaused();
});

/* --- full-size view --- */
const lightbox = $("#lightbox");
const lbImg = $("#lb-img");

$("#story-expand").addEventListener("click", () => {
  const slide = storySlides[storyIdx];
  const img = $(".story__photo", slide);
  lbImg.src = slide.dataset.full || img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  offScreen = true;
  updatePaused();
  $("#lb-close").focus();
});

function closeLightbox() {
  lightbox.hidden = true;
  lbImg.src = "";
  document.body.style.overflow = "";
  offScreen = false;
  updatePaused();
}
$("#lb-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

goStory(0);
updatePaused();

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
