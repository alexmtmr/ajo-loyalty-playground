/* =========================================================
   AJO Loyalty microsite : reactive engine (vanilla JS)
   One `state` object drives render(); everything derives from it.
   Luma = fitness / yoga / fashion brand.
   ========================================================= */

// ---------------- Data ----------------

const PERSONAS = {
  marcus: { name: "Marcus Webb",    age: 30, interest: "Performance & running",     img: "assets/persona-marcus.jpg", defaultTier: "member", offset: 240 },
  anna:   { name: "Anna Kowalska",  age: 27, interest: "Yoga & studio classes",     img: "assets/persona-anna.jpg",   defaultTier: "silver", offset: 300 },
  lukas:  { name: "Lukas Bergmann", age: 42, interest: "Premium activewear",        img: "assets/persona-lukas.jpg",  defaultTier: "gold",   offset: 420 },
};

// tasks differ per challenge type, all in the Luma fitness/yoga/fashion world
const TASK_CATALOG = {
  standard: [
    { id: "class",    main: "Book a yoga class",            sub: "Custom event · class booking" },
    { id: "leggings", main: "Buy a pair of leggings",       sub: "Purchase · Activewear" },
    { id: "spend",    main: "Spend €75 on activewear",      sub: "Spend · minimum €75" },
    { id: "checkin",  main: "Check in at a Luma studio",    sub: "Custom event · studio check-in" },
    { id: "coffee",   main: "Grab a post-workout coffee",   sub: "Purchase · Café" },
    { id: "social",   main: "Share your fit with #LumaLife",sub: "Custom event · social post" },
  ],
  streak: [
    { id: "class",    main: "Attend a yoga class",          sub: "Repeat · class check-in" },
    { id: "workout",  main: "Log a workout in the app",     sub: "Repeat · app activity" },
    { id: "steps",    main: "Hit 10,000 steps",             sub: "Repeat · fitness data" },
    { id: "smoothie", main: "Buy a green smoothie",         sub: "Repeat · Café purchase" },
  ],
  sequential: [
    { id: "profile",  main: "Complete your fitness profile",sub: "Custom event · profile" },
    { id: "book",     main: "Book your first class",        sub: "Custom event · class booking" },
    { id: "attend",   main: "Attend your first class",      sub: "Custom event · class check-in" },
    { id: "gear",     main: "Buy your first activewear",    sub: "Purchase · Activewear" },
    { id: "share",    main: "Share your progress #LumaLife",sub: "Custom event · social post" },
  ],
};

const TYPE_INFO = {
  standard:   { name: "Luma Points Rush",    hint: "Complete any tasks in any order. Best for discovery campaigns and seasonal promos." },
  streak:     { name: "Luma Daily Streak",   hint: "Repeat the same task several times. Best for building habits, daily or weekly." },
  sequential: { name: "Luma Member Journey", hint: "Complete tasks in a set order. Best for guided onboarding, step by step." },
};

// default selection + target when a type is chosen (task ids differ per type)
const TYPE_DEFAULTS = {
  standard:   { tasks: ["class", "leggings", "spend"], required: 3 },
  streak:     { tasks: ["class"],                       required: 5 },
  sequential: { tasks: ["profile", "book", "attend", "gear"], required: 4 },
};

const MOMENTS = [
  { id: "joined",   title: "Joined the challenge",    sub: "Opts in, clock starts" },
  { id: "task",     title: "Completed a task",        sub: "First activity tracked" },
  { id: "complete", title: "Hit the final milestone", sub: "Reward earned" },
  { id: "upgraded", title: "Tier upgraded",           sub: "Levels up" },
];

// content-card imagery per journey moment (mobile 640x360, web 1200x600)
const MOMENT_IMG = {
  joined:   { m: "assets/luma-mobile.jpg",          w: "assets/luma-hero.jpg" },
  task:     { m: "assets/luma-mobile-progress.jpg", w: "assets/luma-hero-progress.jpg" },
  complete: { m: "assets/luma-mobile-complete.jpg", w: "assets/luma-hero-complete.jpg" },
  upgraded: { m: "assets/luma-mobile-upgraded.jpg", w: "assets/luma-hero-upgraded.jpg" },
};
function momentImg() { return MOMENT_IMG[state.moment] || MOMENT_IMG.joined; }

const TIERS = ["none", "member", "silver", "gold"];
const TIER_META = {
  none:   { label: "Not a member", icon: "☆", next: "member", base: 0,    nextAt: null },
  member: { label: "Luma+ Member", icon: "⭐", next: "silver", base: 400,  nextAt: 1000 },
  silver: { label: "Luma+ Silver", icon: "🥈", next: "gold",   base: 2200, nextAt: 5000 },
  gold:   { label: "Luma+ Gold",   icon: "🥇", next: null,     base: 6400, nextAt: null },
};

// ---------------- State ----------------

const state = {
  type: "standard",
  tasks: ["class", "leggings", "spend"],
  required: 3,
  reward: "points",
  amount: 500,
  delivery: "completion",
  persona: "marcus",
  tier: "member",
  moment: "joined",
};

// ---------------- Helpers ----------------

const $ = (sel) => document.querySelector(sel);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (tag === "button") e.type = "button";
  return e;
}

function catalog() { return TASK_CATALOG[state.type]; }
function selectedTasks() { return catalog().filter(t => state.tasks.includes(t.id)); }

function reqCount() { return state.required; }
function perMilestone() { return Math.max(1, Math.round(state.amount / reqCount())); }

function bounds() {
  if (state.type === "streak") return [2, 7];
  if (state.type === "sequential") return [state.tasks.length, state.tasks.length];
  return [1, state.tasks.length];
}
function clampRequired() {
  const [lo, hi] = bounds();
  state.required = Math.min(hi, Math.max(lo, state.required));
}

// reward currency
function hasBalance() { return state.reward !== "coupon"; }
function unit() { return state.reward === "miles" ? "mi" : "pts"; }
function currencyWord() { return state.reward === "miles" ? "miles" : "points"; }
function rewardLabel() {
  if (state.reward === "coupon") return "15% off coupon";
  if (state.reward === "miles") return `${state.amount} miles`;
  return `${state.amount} points`;
}

function tasksDone() {
  if (state.tier === "none") return 0;
  if (state.moment === "joined") return 0;
  if (state.moment === "task") return Math.min(1, reqCount());
  return reqCount();
}
function isComplete() { return state.tier !== "none" && tasksDone() >= reqCount(); }

function effectiveTier() {
  if (state.tier === "none") return "none";
  if (state.moment !== "upgraded") return state.tier;
  const i = TIERS.indexOf(state.tier);
  return TIERS[Math.min(i + 1, TIERS.length - 1)];
}
function didUpgrade() { return effectiveTier() !== state.tier && state.tier !== "none"; }

function baseBalance(tier) { return TIER_META[tier].base + (tier === "none" ? 0 : PERSONAS[state.persona].offset); }
function earnedBalance(done) {
  if (!hasBalance()) return 0;
  if (state.delivery === "milestones") return Math.min(state.amount, perMilestone() * done);
  return done >= reqCount() ? state.amount : 0;
}
function displayBalance(tier, done) { return baseBalance(tier) + earnedBalance(done); }

// ================================================================
//  RENDER
// ================================================================

function render() {
  clampRequired();
  if (state.tier === "none" && state.moment !== "joined") state.moment = "joined";
  renderControls();
  renderJourney();
  renderExperience();
}

/* -------- Top journey bar -------- */
function renderJourney() {
  const wrap = $("#journey-steps"); wrap.innerHTML = "";
  const activeIdx = MOMENTS.findIndex(m => m.id === state.moment);
  const nonMember = state.tier === "none";
  MOMENTS.forEach((m, i) => {
    const locked = nonMember && i > 0;
    const done = i <= activeIdx && !locked;
    const node = el(locked ? "div" : "button", "jstep" + (done ? " done" : "") + (i === activeIdx ? " active" : "") + (locked ? " locked" : ""));
    node.innerHTML = `<span class="jnode">${done ? "✓" : (locked ? "🔒" : i + 1)}</span>
      <span class="jtext"><span class="jtitle">${m.title}</span><span class="jsub">${locked ? "Join first" : m.sub}</span></span>`;
    if (!locked) node.addEventListener("click", () => { state.moment = m.id; render(); });
    wrap.appendChild(node);
  });
}

/* -------- Left controls -------- */
function renderControls() {
  const CAT = catalog();

  document.querySelectorAll("#ctl-type .seg").forEach(b => b.classList.toggle("active", b.dataset.type === state.type));
  $("#type-hint").textContent = TYPE_INFO[state.type].hint;

  // tasks
  const tl = $("#ctl-tasks"); tl.innerHTML = "";
  const firstSel = selectedTasks()[0];
  CAT.forEach(t => {
    const on = state.tasks.includes(t.id);
    const isStreakAction = state.type === "streak" && on && firstSel && firstSel.id === t.id;
    const node = el("button", "task" + (on ? " on" : "") + (isStreakAction ? " streak-action" : ""));
    node.setAttribute("aria-pressed", on);
    node.innerHTML = `<span class="box">${on ? "✓" : ""}</span><span class="t-txt"><span class="t-main">${t.main}${isStreakAction ? ' <span class="tag">repeated</span>' : ""}</span><span class="t-sub">${t.sub}</span></span>`;
    node.addEventListener("click", () => toggleTask(t.id));
    tl.appendChild(node);
  });
  $("#tasks-label").textContent = state.type === "streak" ? "Task to repeat (pick one)" : "Tasks members can complete";

  // stepper / note
  const [lo, hi] = bounds();
  if (state.type === "sequential") {
    $("#stepper-row").style.display = "none";
    $("#type-note").style.display = "block";
    $("#type-note").textContent = `All ${state.tasks.length} steps must be completed in order.`;
  } else {
    $("#stepper-row").style.display = "";
    $("#type-note").style.display = "none";
    $("#req-label").textContent = state.type === "streak" ? "Times to repeat the task" : "Tasks needed to earn the reward";
    $("#ctl-required").textContent = state.required;
    $("#req-minus").disabled = state.required <= lo;
    $("#req-plus").disabled = state.required >= hi;
  }

  // reward
  document.querySelectorAll("#ctl-reward .seg").forEach(b => b.classList.toggle("active", b.dataset.reward === state.reward));
  $("#reward-amount-row").classList.toggle("dim", state.reward === "coupon");
  $("#ctl-amount").value = state.amount;
  $("#amount-out").textContent = rewardLabel();

  // delivery
  document.querySelectorAll("#ctl-delivery .radio").forEach(r => {
    const checked = r.querySelector("input").value === state.delivery;
    r.classList.toggle("active", checked);
    r.querySelector("input").checked = checked;
  });

  // persona
  const pp = $("#ctl-persona"); pp.innerHTML = "";
  Object.entries(PERSONAS).forEach(([id, p]) => {
    const on = state.persona === id;
    const node = el("button", "persona" + (on ? " on" : ""));
    node.setAttribute("aria-pressed", on);
    node.innerHTML = `<span class="avatar" style="background-image:url('${p.img}')"></span>
      <span class="p-txt"><span class="p-name">${p.name}</span><span class="p-meta">${p.age} · ${p.interest}</span></span>`;
    node.addEventListener("click", () => { state.persona = id; state.tier = p.defaultTier; render(); });
    pp.appendChild(node);
  });

  // tier
  document.querySelectorAll("#ctl-tier .seg").forEach(b => b.classList.toggle("active", b.dataset.tier === state.tier));
}

/* -------- Right experience -------- */
function renderExperience() {
  const p = PERSONAS[state.persona];
  const tier = effectiveTier();
  const isMember = tier !== "none";
  const done = tasksDone();
  const pct = Math.round((done / reqCount()) * 100);

  $("#exp-eyebrow").textContent = `Luma loyalty experience for ${p.name}`;
  $("#exp-title").textContent = TYPE_INFO[state.type].name;
  $("#exp-based").innerHTML = isMember
    ? `Based on: <b>${TIER_META[tier].label}</b> · earning <b>${rewardLabel()}</b>`
    : `Based on: <b>not a Luma+ member yet</b>, so the experience invites them to join`;

  const chips = $("#exp-chips"); chips.innerHTML = "";
  chips.appendChild(chip(p.interest, "indigo"));
  chips.appendChild(chip(`${p.age} years old`, "grey"));
  chips.appendChild(chip(TIER_META[tier].label, isMember ? "green" : "grey"));
  if (isMember && hasBalance()) chips.appendChild(chip(`${displayBalance(tier, done).toLocaleString()} ${unit()}`, "gold"));

  renderPhone(isMember, done, pct);
  renderWeb(isMember, done, pct);
  renderMessages(isMember);
  renderTierWidget(tier, isMember, done);
  renderBTS(isMember, tier);
}

function chip(text, kind) { return el("span", `chip ${kind}`, text); }

/* ---- content card builder (phone + web) ---- */
function cardMarkup(isMember, done, pct, opts = {}) {
  const info = TYPE_INFO[state.type];
  const heroClass = "cc-img" + (opts.imgVar ? " " + opts.imgVar : "");
  const imgStyle = opts.img ? `style="background-image:url('${opts.img}')"` : "";
  const req = reqCount();
  const showChip = state.delivery === "milestones" && hasBalance();
  const perChip = showChip ? `<span class="mchip">+${perMilestone()}${unit()}</span>` : "";

  if (!isMember) {
    return `<div class="cc">
      <div class="${heroClass}" ${imgStyle}><span class="cc-badge">Luma+ Rewards</span></div>
      <div class="cc-body">
        <p class="cc-title">Join Luma+ and start earning ${rewardLabel()}</p>
        <p class="cc-desc">Become a member and complete the ${info.name} to earn rewards on your workouts, classes and gear.</p>
        <button class="btn">Join Luma+</button>
      </div></div>`;
  }

  if (isComplete()) {
    const upgraded = state.moment === "upgraded" && didUpgrade();
    const badge = upgraded ? `🎖️ ${TIER_META[effectiveTier()].label} unlocked` : "🏆 Challenge complete";
    return `<div class="cc">
      <div class="${heroClass}" ${imgStyle}><span class="cc-badge">${badge}</span></div>
      <div class="cc-body">
        <p class="cc-title">${upgraded ? `Welcome to ${TIER_META[effectiveTier()].label}!` : "Challenge complete!"}</p>
        <p class="cc-desc">${upgraded
          ? `You finished the ${info.name} and levelled up. Enjoy your new ${TIER_META[effectiveTier()].label} perks.`
          : `You finished the ${info.name}. Your ${rewardLabel()} ${state.reward === "coupon" ? "is ready to use" : "have been added"}.`}</p>
        <div class="cc-reward">🎁 <span>${rewardLabel()} earned</span></div>
        <button class="btn ghost">${state.reward === "coupon" ? "View coupon" : "See my rewards"}</button>
      </div></div>`;
  }

  const selected = selectedTasks();
  let body;

  if (state.type === "streak") {
    const action = selected[0] ? selected[0].main : "Complete the task";
    const dots = Array.from({ length: req }, (_, i) =>
      `<span class="sdot ${i < done ? "on" : ""}">${i < done ? "🔥" : i + 1}</span>`).join("");
    body = `
      <p class="cc-title">${info.name}</p>
      <p class="cc-desc">Repeat <b>${action}</b> ${req} times to earn ${rewardLabel()}.</p>
      <div class="progress">
        <div class="progress-top"><span>Streak</span><span>${done} of ${req}</span></div>
        <div class="streak">${dots}</div>
      </div>
      <div class="cc-reward">🎁 <span>Reward: ${rewardLabel()}${showChip ? ` · ${perMilestone()}${unit()} per repeat` : ""}</span></div>
      <button class="btn">${done === 0 ? "Start my streak" : "Log today"}</button>`;

  } else if (state.type === "sequential") {
    const steps = selected.map((t, i) => {
      const d = i < done, next = i === done;
      const icon = d ? "✓" : (next ? i + 1 : "🔒");
      return `<div class="cc-task seq ${d ? "done" : next ? "next" : "locked"}"><span class="tick">${icon}</span><span class="lbl">${t.main}</span>${d ? perChip : ""}</div>`;
    }).join("");
    body = `
      <p class="cc-title">${info.name}</p>
      <p class="cc-desc">Complete these ${req} steps in order to earn ${rewardLabel()}.</p>
      <div class="progress">
        <div class="progress-top"><span>Your progress</span><span>${done} of ${req} steps</span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>
      <div class="cc-tasks">${steps}</div>
      <div class="cc-reward">🎁 <span>Reward: ${rewardLabel()}${showChip ? " · paid at each step" : ""}</span></div>
      <button class="btn">${done === 0 ? "Start the journey" : "Continue"}</button>`;

  } else {
    const M = selected.length;
    const tasksHtml = selected.map((t, i) => {
      const d = i < done;
      return `<div class="cc-task ${d ? "done" : ""}"><span class="tick">${d ? "✓" : ""}</span><span class="lbl">${t.main}</span>${d ? perChip : ""}</div>`;
    }).join("");
    const rule = req >= M ? `Complete all ${M} tasks` : `Complete any ${req} of ${M} tasks`;
    body = `
      <p class="cc-title">${info.name}</p>
      <p class="cc-desc">${rule} to earn ${rewardLabel()}.</p>
      <div class="progress">
        <div class="progress-top"><span>Your progress</span><span>${done} of ${req} done</span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>
      <div class="cc-tasks">${tasksHtml}</div>
      <div class="cc-reward">🎁 <span>Reward: ${rewardLabel()}${showChip ? " · at each milestone" : ""}</span></div>
      <button class="btn">${done === 0 ? "Join the challenge" : "Keep going"}</button>`;
  }

  return `<div class="cc"><div class="${heroClass}" ${imgStyle}><span class="cc-badge">${info.name}</span></div><div class="cc-body">${body}</div></div>`;
}

function renderPhone(isMember, done, pct) {
  $("#phone-card").innerHTML = cardMarkup(isMember, done, pct, { img: momentImg().m });
}
function renderWeb(isMember, done, pct) {
  $("#web-card").innerHTML = `<div class="web-hero">${cardMarkup(isMember, done, pct, { imgVar: "web-hero-img", img: momentImg().w })}</div>`;
}

/* ---- lifecycle messaging: the message AJO auto-sends at the current moment ---- */
function renderMessages(isMember) {
  const info = TYPE_INFO[state.type];
  const r = rewardLabel();
  const first = PERSONAS[state.persona].name.split(" ")[0];
  const req = reqCount(), done = tasksDone();
  let label, channels, msg;

  if (!isMember) {
    label = "the moment they're invited";
    channels = [{ ic: "📱", n: "In-app" }, { ic: "✉️", n: "Email" }];
    msg = { title: `Join Luma+ and earn ${r}`, body: `Hi ${first}, become a member and complete the ${info.name} to earn ${r} on your workouts and gear.` };
  } else if (state.moment === "joined") {
    label = "the moment they join";
    channels = [{ ic: "📱", n: "In-app" }, { ic: "✉️", n: "Email" }];
    msg = { title: `You're in! ${info.name}`, body: `Welcome, ${first}. Complete the challenge to earn ${r}. We'll cheer you on the whole way.` };
  } else if (state.moment === "task") {
    const left = Math.max(1, req - done);
    label = "as they make progress";
    channels = [{ ic: "🔔", n: "Push" }, { ic: "📱", n: "In-app" }];
    msg = { title: `Nice start, keep going`, body: `${done} of ${req} done. ${left} more to unlock your ${r}.` };
  } else if (state.moment === "complete") {
    label = "the moment they finish";
    channels = [{ ic: "📱", n: "In-app" }, { ic: "✉️", n: "Email" }];
    msg = { title: `🎉 Reward unlocked: ${r}`, body: `Amazing work, ${first}! You finished the ${info.name} and earned ${r}.` };
  } else {
    const t = TIER_META[effectiveTier()].label;
    label = "the moment they level up";
    channels = [{ ic: "✉️", n: "Email" }, { ic: "🔔", n: "Push" }];
    msg = { title: `You've reached ${t}!`, body: `Congratulations, ${first}. You levelled up to ${t}. Enjoy your new perks.` };
  }

  $("#lc-moment-label").textContent = label;
  $("#message-cards").innerHTML = channels.map(c => `
    <div class="msg">
      <div class="msg-chan"><span class="ic">${c.ic}</span> ${c.n} · auto-sent</div>
      <p class="msg-title">${msg.title}</p>
      <p class="msg-body">${msg.body}</p>
    </div>`).join("");
}

/* ---- tier & status widget (currency matches reward) ---- */
function renderTierWidget(tier, isMember, done) {
  if (!isMember) {
    $("#tier-widget").innerHTML = `<div class="tw-top">
        <div class="tw-tier"><div class="tw-badge">☆</div><div><div class="tw-tier-name">Not a Luma+ member</div><div class="tw-tier-sub">Join to start earning ${currencyWord()} & tiers</div></div></div>
      </div>
      <div class="tw-progress"><div class="progress-top"><span>Member benefits await</span><span>0 ${unit()}</span></div><div class="bar"><span style="width:4%"></span></div></div>`;
    return;
  }

  const meta = TIER_META[tier];
  let sub = "Current status";
  if (state.moment === "upgraded") sub = didUpgrade() ? "Just levelled up 🎉" : "Already at the top tier";

  // coupon rewards have no running balance — show status only
  if (!hasBalance()) {
    $("#tier-widget").innerHTML = `<div class="tw-top">
        <div class="tw-tier"><div class="tw-badge">${meta.icon}</div><div><div class="tw-tier-name">${meta.label}</div><div class="tw-tier-sub">${sub}</div></div></div>
      </div>
      <p class="tw-note">Coupon rewards are a perk, so they don't change the ${currencyWord()} balance. Switch the reward to Points or Miles to watch the balance grow.</p>`;
    return;
  }

  const pts = displayBalance(tier, done);
  let progressHtml;
  if (meta.next) {
    const nextThreshold = meta.nextAt;
    const ready = pts >= nextThreshold;
    const pctToNext = Math.min(100, Math.round((pts / nextThreshold) * 100));
    const lbl = ready ? `Ready to reach ${TIER_META[meta.next].label} 🎉` : `Progress to ${TIER_META[meta.next].label}`;
    progressHtml = `<div class="tw-progress"><div class="progress-top"><span>${lbl}</span><span>${pts.toLocaleString()} / ${nextThreshold.toLocaleString()} ${unit()}</span></div><div class="bar"><span style="width:${pctToNext}%"></span></div></div>`;
  } else {
    progressHtml = `<div class="tw-progress"><div class="progress-top"><span>Top tier reached</span><span>Enjoy your perks</span></div><div class="bar"><span style="width:100%"></span></div></div>`;
  }

  $("#tier-widget").innerHTML = `<div class="tw-top">
      <div class="tw-tier"><div class="tw-badge">${meta.icon}</div><div><div class="tw-tier-name">${meta.label}</div><div class="tw-tier-sub">${sub}</div></div></div>
      <div class="tw-points"><div class="num">${pts.toLocaleString()}</div><div class="lbl">${currencyWord()}</div></div>
    </div>${progressHtml}`;
}

/* ---- behind the scenes ---- */
function renderBTS(isMember, tier) {
  const info = TYPE_INFO[state.type];
  const mech = {
    standard:   `any ${reqCount()} of ${state.tasks.length} tasks in any order`,
    streak:     `the same task repeated ${reqCount()} times`,
    sequential: `${state.tasks.length} tasks completed in a fixed order`,
  }[state.type];
  const momentTitle = MOMENTS.find(m => m.id === state.moment).title;
  $("#bts-body").innerHTML = `<ul>
    <li><b>Challenge type: ${state.type}.</b> This challenge is ${mech}. ${info.hint}</li>
    <li><b>Reward rule.</b> Members earn <b>${rewardLabel()}</b>, delivered ${state.delivery === "milestones" ? `at <b>each milestone</b>, so ${currencyWord()} accrue as they go` : "on <b>challenge completion</b>"}.</li>
    <li><b>Personalization.</b> ${isMember ? `As a <b>${TIER_META[tier].label}</b>, ${PERSONAS[state.persona].name} sees live progress${hasBalance() ? ` and ${currencyWord()}` : ""}, while a non-member is invited to join first.` : `${PERSONAS[state.persona].name} isn't a member yet, so every channel invites them to join before showing challenge progress.`}</li>
    <li><b>Automated messaging.</b> At "<b>${momentTitle}</b>", AJO sends the right message on the right channel from a journey it generates and keeps in sync. No campaign to build by hand.</li>
  </ul>`;
}

// ---------------- Events ----------------
function toggleTask(id) {
  if (state.type === "streak") { state.tasks = [id]; render(); return; } // one repeated task
  const i = state.tasks.indexOf(id);
  if (i >= 0) { if (state.tasks.length > 1) state.tasks.splice(i, 1); }
  else state.tasks.push(id);
  render();
}

function bindEvents() {
  document.querySelectorAll("#ctl-type .seg").forEach(b =>
    b.addEventListener("click", () => {
      state.type = b.dataset.type;
      const d = TYPE_DEFAULTS[state.type];
      state.tasks = d.tasks.slice();
      state.required = d.required;
      render();
    }));

  document.querySelectorAll("#ctl-reward .seg").forEach(b =>
    b.addEventListener("click", () => { state.reward = b.dataset.reward; render(); }));

  document.querySelectorAll("#ctl-tier .seg").forEach(b =>
    b.addEventListener("click", () => { state.tier = b.dataset.tier; render(); }));

  $("#req-plus").addEventListener("click", () => { const [, hi] = bounds(); if (state.required < hi) { state.required++; render(); } });
  $("#req-minus").addEventListener("click", () => { const [lo] = bounds(); if (state.required > lo) { state.required--; render(); } });

  $("#ctl-amount").addEventListener("input", (e) => { state.amount = +e.target.value; renderExperience(); $("#amount-out").textContent = rewardLabel(); });

  document.querySelectorAll("#ctl-delivery input").forEach(r =>
    r.addEventListener("change", () => { state.delivery = r.value; render(); }));
}

// ---------------- Init ----------------
bindEvents();
render();
