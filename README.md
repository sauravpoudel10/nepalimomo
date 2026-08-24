# Momo's Hunt — website

Static site (no build step). Open `index.html` in a browser, or drop the whole
folder onto Netlify / Vercel / Cloudflare Pages / any web host.

```
index.html
assets/css/styles.css
assets/js/main.js
assets/img/          generated images (dishes, gallery, hero, logo)
img/                 your original photos (untouched)
nnn.pdf              the design reference (untouched)
```

## 1. Add the DoorDash / Uber Eats links

Open `assets/js/main.js` — the first block in the file:

```js
const ORDER_LINKS = {
  doordash: "",   // paste the DoorDash store URL between the quotes
  ubereats: ""    // paste the Uber Eats store URL between the quotes
};
```

Until a link is filled in, the button still shows but tapping it says
"Delivery link coming soon — call us on +61 405 140 747."
Fill in the quotes and the button opens the real store in a new tab.
One edit covers every place the button appears.

## 2. Things to check before going live

- **Prices** are the ones from the PDF mockup. Items that weren't in the PDF
  (Samosa, Papadi Chat, Khaja Set, Chowmein, Chicken Lollipop, Laphing, Sekuwa,
  Goat Curry, drinks, sweets) have plausible placeholder prices — confirm them
  and edit the two spots per item in `index.html`: the visible `$…` text and the
  `data-price="…"` attribute on the same row.
- **Hours** live in two places: the `HOURS` object in `assets/js/main.js`
  (drives the "Open now / Closed" badge) and the table in `index.html`.
- **Phone numbers** come from your street sign: restaurant +61 405 140 747,
  Chef Mira +61 493 674 190, bookings +61 449 573 676.

## 3. How the ordering works

Tapping **+** builds an order in the bar at the bottom of the screen; **Send on
WhatsApp** opens WhatsApp to +61 405 140 747 with the order written out. The
cart survives a page refresh. Change the receiving number with `WHATSAPP_NUMBER`
in `assets/js/main.js`.

## 4. Images

`assets/img/` is generated from the photos in `img/`:

- **Dish cards** — cut from the yellow window board photo and placed on a clean
  matching backdrop. Replace any of them by dropping a new 4:3 JPG over the same
  filename in `assets/img/dishes/`.
- **Gallery** — each photo has a full-size and a `-sm` version; the page picks
  the right one per screen. Add a photo by copying a `<figure class="story__slide">`
  block in `index.html` — the progress bars are built from the slides, so a new
  one is picked up automatically. Change how long each photo holds with
  `STORY_SECONDS` in `assets/js/main.js`.
- **Logo** — `assets/img/logo-mark.png` is a white silhouette used as a CSS
  mask, so it can be tinted any colour (crimson in the header, yellow in the
  footer).

## 5. Responsive behaviour

Mobile-first. Breakpoints at 640px and 900px:

- **Mobile** — matches the PDF: single column, sticky "Start an order" bar,
  2-up dish cards, full-width story player.
- **Desktop (900px+)** — top navigation with scroll-spy, wide hero with the
  mural on the right, 4-up dish cards, two-column menu, the story beside its
  heading with arrows either side, and the order bar as a floating card.

## 6. The gallery story

The gallery sits directly after "The famous eight" and plays like an Instagram
story: segmented progress bars across the top, each photo holding for 5 seconds
before a cross-fade and a slow push-in.

- Tap the right side to move on, the left side to go back
- Press and hold anywhere to pause; let go to resume
- Swipe on a phone, arrow keys on a desktop, space to pause
- Tap any bar to jump straight to that photo
- The button at the bottom-right opens the photo full size

It only plays while it is on screen, and stops when the tab is hidden. Under
`prefers-reduced-motion` it stops advancing on its own — the arrows, bars and
keys still work.
