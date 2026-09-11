# AJO Loyalty — Interactive Microsite

An interactive concept microsite that conveys the value of **Adobe Journey Optimizer Loyalty**
through exploration. Configure a gamified loyalty challenge on the left and watch the customer
experience — content cards, tiers, points and automated lifecycle messaging — react in real time
on the right. Built around Adobe's fictional **Luma** fitness / yoga / fashion brand.

## Run locally

Dependency-free static site, no build step:

    python3 -m http.server 8137
    # then open http://localhost:8137

(or just open `index.html` in a browser).

## What it demonstrates

- Gamified **challenges** — Standard, Streak and Sequential, each with distinct tasks
- **Points, miles or coupons**, delivered on completion or at each milestone
- **Tiers & status** progression (Luma+ Member → Silver → Gold)
- **Automated lifecycle messaging** across in-app, email and push, generated per journey moment

## Structure

- `index.html` — page structure
- `css/styles.css` — styling
- `js/app.js` — the reactive engine (one `state` object drives everything)
- `assets/` — imagery (see `assets/README.md` for the manifest)
- `vercel.json` — static deploy config

## Deploy

Static site, deployable as-is (e.g. Vercel).
