/**
 * routine-card / routine-mini-card: a routine (morning, evening) as illustrated steps. The step in progress with its
 * timer and a progress ring, every step as a tile, the week's stars and a button to mark the step done.
 * https://github.com/juju35/ha-routine-card
 */

// Colour of each status, and the header's icon of each period.
const RT_COLORS = { progress: "#7c4ddb", idle: "#8a929c", done: "#1e8e5a", alert: "#d93838", empty: "#8a929c" };
const RT_ICONS = { morning: "mdi:weather-sunset-up", evening: "mdi:weather-night" };
// One loop of the banner's animations (s): the sun's glow, the stars, the sparkles of a finished routine.
const RT_LOOP = 3;

// ── Banner ───────────────────────────────────────────────────────────────────
// The illustrated header's scene: 200 × 80, drawn to the banner's right edge. Morning: a house on a hill, the sun
// rising with the routine's progress (low at the start, high once done). Evening: the moon over the house, whose
// windows go dark step by step. Sparkles twinkle around the house once the routine is done. By night (the dark
// theme), a darker sky. `compact` (the mini card's narrow corner): the sun or the moon alone.
const rtScene = ({ night, period, fraction, done, animate, compact }) => {
  const evening = period === "evening";
  const glow = (cx, cy, r) =>
    animate ? `<animate attributeName="r" values="${r};${r + 5};${r}" dur="${RT_LOOP}s" repeatCount="indefinite"/>` : "";
  let sky;
  if (evening) {
    const twinkle = (i) =>
      animate ? `<animate attributeName="opacity" values="1;.25;1" dur="${RT_LOOP}s" begin="${((i * RT_LOOP) / 5).toFixed(2)}s" repeatCount="indefinite"/>` : "";
    const stars = [
      [20, 14],
      [52, 30],
      [84, 10],
      [118, 22],
      [186, 40],
    ]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${night ? "#fff" : "#7c4ddb"}" opacity="${night ? 0.9 : 0.55}">${twinkle(i)}</circle>`)
      .join("");
    sky = `${stars}<circle cx="160" cy="26" r="13" fill="${night ? "#f4f1ff" : "#fff"}"/><circle cx="166" cy="21" r="11" fill="${night ? "#262443" : "#e4dcf8"}"/>`;
  } else {
    // The sun climbs from the hill (y 64) to the sky (y 24) with the progress.
    const y = Math.round(64 - 40 * fraction);
    const sun = night ? "#f6b26b" : "#ffd27a";
    sky = `<circle cx="160" cy="${y}" r="22" fill="${sun}" opacity=".28">${glow(160, y, 22)}</circle><circle cx="160" cy="${y}" r="14" fill="${sun}"/>`;
  }
  const hill = evening ? (night ? "#2e2b50" : "#d3c8f1") : night ? "#3a3550" : "#f3e3c2";
  const wall = night ? "#4a4566" : "#fff";
  const edge = evening ? (night ? "#5d5784" : "#b9a9e6") : night ? "#5e5878" : "#e2cfa8";
  // Four windows: lit in the morning; at night, the ones still lit are the steps left.
  const left = evening ? Math.ceil((1 - fraction) * 4) : 4;
  const lit = (i) => (evening ? (i < left ? "#ffe7a8" : night ? "#2a2745" : "#cfc6ea") : night ? "#ffd98a" : "#ffe7a8");
  const sparkles = done
    ? [
        [62, 40],
        [118, 30],
        [46, 60],
        [132, 52],
      ]
        .map(
          ([x, y], i) =>
            `<path d="M${x} ${y - 5}l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" fill="${night ? "#ffe08a" : "#e0a100"}">${
              animate ? `<animate attributeName="opacity" values="0;1;0" dur="${RT_LOOP}s" begin="${((i * RT_LOOP) / 4).toFixed(2)}s" repeatCount="indefinite"/>` : ""
            }</path>`,
        )
        .join("")
    : "";
  const ground = `<path d="M0 66 Q60 52 120 62 T200 58 V80 H0Z" fill="${hill}"/>`;
  if (compact) return sky;
  return `${sky}${ground}
    <g class="house"><path d="M66 78V48l24-18 24 18v30Z" fill="${wall}" stroke="${edge}" stroke-width="1.5"/>
      <rect x="74" y="52" width="9" height="9" fill="${lit(0)}"/><rect x="97" y="52" width="9" height="9" fill="${lit(1)}"/>
      <rect x="74" y="65" width="9" height="9" fill="${lit(2)}"/><rect x="86" y="64" width="8" height="14" fill="${edge}"/>
      <rect x="97" y="65" width="9" height="9" fill="${lit(3)}"/></g>${sparkles}`;
};

// The status pill's place, decided by measurement after each render and each new width: always on the title row,
// right after the title (the charte keeps it beside the title, never under the subtitle). When the whole title and
// the pill's whole label do not fit there, the pill keeps its dot alone, still on the title row (its label stays in
// title and aria-label, and the hero below says the same). A card of 200 px or less shows the dot alone anyway (CSS).
const rtPlacePill = (head, row) => {
  if (!head) return;
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-dot", "");
};

// A progress ring of `size` px: the fraction done, its text in the middle.
const rtRing = (size, stroke, fraction, text, label) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (c * Math.min(1, Math.max(0, fraction))).toFixed(1);
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${rcEsc(label)}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ringbg)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--c)" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${dash} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${Math.round(size / 4.4)}" font-weight="700" fill="currentColor">${rcEsc(text)}</text></svg>`;
};

// ── Card ─────────────────────────────────────────────────────────────────────
class RoutineCard extends RcCard {
  static tag = "routine-card";
  static i18n = RT_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", show_subtitle: true, animations: true, period: "auto", columns: 3, stars_goal: 5 };

  // The input_boolean helpers named after a routine, when there are some; a sample routine otherwise.
  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states ?? {}).filter((id) => id.startsWith("input_boolean.") && id.includes("routine"));
    if (ids.length) return { steps: ids.slice(0, 6).map((entity) => ({ entity, duration: 5 })) };
    return {
      steps: [
        { name: "Get up", icon: "mdi:bed-clock", duration: 5 },
        { name: "Get dressed", icon: "mdi:tshirt-crew", duration: 10 },
        { name: "Breakfast", icon: "mdi:food-croissant", duration: 15 },
        { name: "Brush teeth", icon: "mdi:toothbrush", duration: 2 },
      ],
    };
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    super.connectedCallback?.();
    // The timer of the step in progress, once a second (the text alone, not the whole card).
    this._timer ??= setInterval(() => this._tick(), 1000);
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    clearInterval(this._timer);
    this._timer = undefined;
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
  }

  // The base card's tiles are this card's steps; the rest of the model (status, timer) goes to `_draw`.
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    this._model = rtModel(this._hass, this._config, Date.now());
    this._items = this._model.steps;
    this._draw(this._model);
  }

  // Once a second: the timer's text and bar; a full redraw when the step runs over (or back), or the routine turns
  // late at its due time.
  _tick() {
    const m = this._model;
    if (!m || !this.shadowRoot) return;
    const now = Date.now();
    const cur = m.current;
    const late = m.due != null && m.done < m.total && Math.floor((now - rtMidnight(now)) / 60000) >= m.due;
    if (late !== m.late) return this._render();
    if (!cur?.start || !cur.duration) return;
    const left = cur.duration * 60 - (now - cur.start) / 1000;
    if (left < 0 !== cur.left < 0) return this._render();
    cur.left = left;
    for (const el of this.shadowRoot.querySelectorAll(".tmr")) el.textContent = this._timeLeft(left);
    for (const el of this.shadowRoot.querySelectorAll(".cbar > i")) el.style.width = `${this._elapsed(cur)}%`;
  }

  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  _time(t) {
    try {
      return new Intl.DateTimeFormat(this._lang(), { hour: "numeric", minute: "2-digit" }).format(new Date(t));
    } catch {
      return new Date(t).toTimeString().slice(0, 5);
    }
  }

  // The due time (minutes after midnight) as a time of day.
  _due(minutes) {
    const d = new Date(Date.now());
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return this._time(d.getTime());
  }

  // "1:20 left", "+0:45 over".
  _timeLeft(left) {
    return left < 0 ? this._t("over", { t: `+${rtClock(-left)}` }) : this._t("left", { t: rtClock(left) });
  }

  // The share of the step's time already spent (%).
  _elapsed(s) {
    if (!s.duration || s.left == null) return 0;
    return Math.round(Math.min(100, Math.max(0, 100 - (s.left / (s.duration * 60)) * 100)));
  }

  _name(s) {
    return s.name || this._t("step_n", { n: s.index + 1 });
  }

  _title(m) {
    return this._config.title || this._t(m.period);
  }

  _level(m) {
    return m.state === "late" ? "alert" : m.state;
  }

  // The status pill: "3 / 6 · 12 min", "Not started", "All done", "Late · 2 left".
  _status(m) {
    if (m.state === "empty") return "";
    if (m.state === "done") return this._t("st_done");
    if (m.state === "late") return this._tn("st_late", m.total - m.done, { n: m.total - m.done });
    if (m.state === "idle") return this._t("st_idle");
    return m.left ? this._t("st_progress_time", { done: m.done, total: m.total, min: m.left }) : this._t("st_progress", { done: m.done, total: m.total });
  }

  _sub() {
    const c = this._config;
    if (c.show_subtitle === false) return "";
    const due = rtMinutes(c.deadline);
    const text = c.subtitle || (due != null ? this._t("due", { t: this._due(due) }) : "");
    return text ? `<div class="subt">${rcEsc(text)}</div>` : "";
  }

  // The illustrated header: the badge, the title, `sub` and the pill on the left, the house at the right, a 10 px
  // ground strip edge to edge. `badge`: the badge's content (the mini card draws its progress ring there).
  _banner(m, sub, badge, compact = false) {
    const c = this._config;
    const nav = c.navigation_path;
    const night = this._night();
    const pill = this._status(m);
    const chip = pill ? `<span class="bpill" title="${rcEsc(pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    const scene = rtScene({ night, period: m.period, fraction: m.fraction, done: m.state === "done", animate: this._animate(), compact });
    return `
      <div class="banner p-${m.period}${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
          <div class="badge">${badge}</div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(this._title(m))}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  _icon(m) {
    return this._config.icon || RT_ICONS[m.period];
  }

  // The status pill's place, on the banner and on the classic header (see rtPlacePill).
  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      rtPlacePill(banner || row.closest(".head"), row);
    }
  }

  // The step in progress in big: the ring, its name, its timer and what comes next.
  _hero(m) {
    const ring = rtRing(64, 7, m.fraction, `${Math.round(m.fraction * 100)}%`, this._t("progress_aria", { p: Math.round(m.fraction * 100) }));
    let head;
    let sub;
    let bar = "";
    const cur = m.current;
    if (m.state === "empty") {
      head = this._t("no_steps");
      sub = this._t("no_steps_hint");
    } else if (m.state === "done") {
      const end = Math.max(...m.steps.map((s) => s.at || 0));
      head = this._t("all_done");
      sub = end ? this._t("finished", { t: this._time(end) }) : "";
    } else if (!cur) {
      head = this._t("st_idle");
      sub = this._t("unavailable");
    } else {
      const next = m.steps.slice(cur.index + 1).find((s) => !s.done);
      const after = next ? this._t("next_step", { name: this._name(next) }) : this._t("last");
      head = m.state === "idle" ? this._t("first", { name: this._name(cur) }) : this._t("now", { name: this._name(cur) });
      const timer = cur.left != null ? (cur.start ? `<span class="tmr">${rcEsc(this._timeLeft(cur.left))}</span>` : rcEsc(this._tn("mins", cur.duration, { n: cur.duration }))) : "";
      sub = `${timer}${timer ? " · " : ""}${rcEsc(after)}`;
      if (cur.start && cur.duration) bar = `<span class="cbar"><i style="width:${this._elapsed(cur)}%"></i></span>`;
      return `<div class="hero">${ring}<div class="ht"><div class="hn">${rcEsc(head)}</div><div class="hs">${sub}</div>${bar}</div></div>`;
    }
    return `<div class="hero">${ring}<div class="ht"><div class="hn">${rcEsc(head)}</div><div class="hs">${rcEsc(sub)}</div></div></div>`;
  }

  // One tile per step: done (green, the time it was done), in progress (accent, its timer), to do (grey, its duration).
  _tile(s) {
    let state;
    let cls;
    let t;
    if (s.unavailable) {
      [state, cls, t] = [this._t("unavailable"), " na", RT_COLORS.idle];
    } else if (s.done) {
      [state, cls, t] = [s.at ? this._t("done_at", { t: this._time(s.at) }) : this._t("done"), "", RT_COLORS.done];
    } else if (s.current && s.start && s.left != null) {
      const over = s.left < 0;
      [state, cls, t] = [`<span class="tmr">${rcEsc(this._timeLeft(s.left))}</span>`, ` cur${over ? " over" : ""}`, over ? RT_COLORS.alert : RT_COLORS.progress];
      return this._tileHtml(s, state, cls, t);
    } else if (s.current) {
      [state, cls, t] = [this._t("in_progress"), " cur", RT_COLORS.progress];
    } else {
      [state, cls, t] = [s.duration ? this._tn("mins", s.duration, { n: s.duration }) : this._t("todo"), " off", RT_COLORS.idle];
    }
    return this._tileHtml(s, rcEsc(state), cls, t);
  }

  _tileHtml(s, state, cls, t) {
    const icon = s.icon || (s.done ? "mdi:check-circle" : "mdi:checkbox-blank-circle-outline");
    return `<button class="tile${cls}${s.done ? " done" : ""}" data-id="${rcEsc(s.id)}" style="--t:${t}">
      <span class="ic"><ha-icon icon="${rcEsc(icon)}"></ha-icon></span>
      <span class="txt"><span class="name">${rcEsc(this._name(s))}</span><span class="state">${state}</span></span>
    </button>`;
  }

  // The week's stars (an entity counting them) and the reward, then the button marking the step in progress done.
  _afterGrid() {
    const m = this._model;
    const c = this._config;
    if (!m) return "";
    let stars = "";
    const st = c.stars_entity ? this._hass.states?.[c.stars_entity] : undefined;
    if (st) {
      const goal = Math.max(1, Math.min(10, Math.round(Number(c.stars_goal) || 5)));
      const n = Math.max(0, Math.round(Number(st.state) || 0));
      const icons = Array.from({ length: goal }, (_, i) => `<ha-icon class="${i < n ? "on" : ""}" icon="${i < n ? "mdi:star" : "mdi:star-outline"}"></ha-icon>`).join("");
      const reward = c.reward ? `<span class="rw">${rcEsc(this._t("reward", { r: c.reward }))}</span>` : "";
      stars = `<button class="stars" data-k="stars"><span class="si">${icons}</span><span class="stx"><span class="sn">${rcEsc(this._tn("stars", n, { n, goal }))}</span>${reward}</span></button>`;
    }
    const mark = m.current?.entity && m.state !== "done" ? `<button class="mark" data-k="mark"><ha-icon icon="mdi:check"></ha-icon><span>${rcEsc(this._t("mark_done"))}</span></button>` : "";
    return stars || mark ? `<div class="foot">${stars}${mark}</div>` : "";
  }

  _bindAfter(root) {
    const m = this._model;
    root.querySelector(".mark")?.addEventListener("click", () => m?.current?.entity && rcCall(this._hass, "homeassistant", "turn_on", { entity_id: m.current.entity }));
    root.querySelector(".stars")?.addEventListener("click", () => rcMoreInfo(this, this._config.stars_entity));
  }

  // A tap toggles the step's entity (done / not done), a hold opens its details; a step with no entity does nothing.
  _bindTile(el, item) {
    if (!item?.entity) return;
    this._bindPress(el, {
      onTap: () => !item.unavailable && rcCall(this._hass, "homeassistant", "toggle", { entity_id: item.entity }),
      onHold: () => rcMoreInfo(this, item.entity),
    });
  }

  _draw(m) {
    const c = this._config;
    const dark = this._dark();
    const night = this._night();
    const over = m.current?.left != null && m.current.left < 0;
    const stars = c.stars_entity ? this._hass.states?.[c.stars_entity]?.state : null;
    // The timer's seconds are not part of it: _tick updates them in place.
    const steps = m.steps.map((s) => [s.name, s.icon, s.done, s.at, s.unavailable, s.current, s.start]);
    if (!this._changed([steps, m.state, m.left, m.period, over, stars, dark, night])) return;
    const level = this._level(m);
    const badge = `<ha-icon icon="${rcEsc(this._icon(m))}"></ha-icon>`;
    const head =
      c.illustration !== false
        ? this._banner(m, this._sub(), badge)
        : `<div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
            <div class="badge">${badge}</div>
            <div class="tt"><div class="trow"><div class="title">${rcEsc(this._title(m))}</div>${this._status(m) ? `<span class="pill"><span class="pt">${rcEsc(this._status(m))}</span></span>` : ""}</div>${this._sub()}</div>
          </div>`;
    const tiles = m.steps.map((s) => this._tile(s)).join("");
    this._paint(level, head + this._hero(m), tiles, ` st-${m.state}${dark ? " dk" : ""}`);
    this._fitPill();
  }

  static styles = `
    ha-card { --c: #7c4ddb; --ringbg: color-mix(in srgb, var(--c) 16%, transparent); }
    ha-card.lvl-progress { --c: #7c4ddb; } ha-card.lvl-idle, ha-card.lvl-empty { --c: #8a929c; }
    ha-card.lvl-done { --c: #1e8e5a; } ha-card.lvl-alert { --c: #d93838; }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .hero { margin-top: 12px; display: flex; align-items: center; gap: 14px; color: var(--primary-text-color); }
    .ring { flex: none; }
    .ht { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .hn { font-size: 15px; font-weight: 600; color: var(--primary-text-color); overflow-wrap: anywhere; }
    .hs { font-size: 13px; color: var(--secondary-text-color); }
    .tmr { font-variant-numeric: tabular-nums; font-weight: 600; color: color-mix(in srgb, var(--c) 60%, var(--primary-text-color, #212121)); }
    .cbar { display: block; height: 6px; margin-top: 6px; border-radius: 3px; background: var(--ringbg); overflow: hidden; }
    .cbar > i { display: block; height: 100%; border-radius: 3px; background: var(--c); transition: width 1s linear; }
    .grid { margin-top: 12px; }
    .tile { min-height: 48px; }
    .tile.cur { border: 1.5px solid var(--t); background: color-mix(in srgb, var(--t) 10%, var(--card-background-color, #fff)); }
    .tile.cur .state { color: color-mix(in srgb, var(--t) 60%, var(--primary-text-color, #212121)); font-weight: 500; }
    .tile.done .state { color: color-mix(in srgb, var(--t) 60%, var(--primary-text-color, #212121)); font-weight: 500; }
    .tile.over .tmr { color: inherit; }
    ha-card.dk .tile.cur .state, ha-card.dk .tile.done .state, ha-card.dk .tmr { color: color-mix(in srgb, var(--t, var(--c)) 55%, #fff); }
    .foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .stars { all: unset; cursor: pointer; flex: 1 1 220px; min-width: 0; box-sizing: border-box; display: flex; align-items: center; gap: 10px;
             padding: 8px 12px; border-radius: 12px; background: color-mix(in srgb, #e0a100 12%, var(--card-background-color, #fff)); }
    .stars:focus-visible, .mark:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .si { display: inline-flex; gap: 1px; flex: none; color: #e0a100; }
    .si ha-icon { --mdc-icon-size: 18px; opacity: .55; } .si ha-icon.on { opacity: 1; }
    .stx { display: flex; flex-direction: column; min-width: 0; }
    .sn { font-size: 13px; font-weight: 600; color: var(--primary-text-color); }
    .rw { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mark { all: unset; cursor: pointer; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; min-height: 36px;
            padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-left: auto;
            color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color, #212121)); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); }
    .mark:hover { background: color-mix(in srgb, var(--c) 10%, transparent); }
    .mark ha-icon { --mdc-icon-size: 16px; }
    ha-card.dk .mark { color: color-mix(in srgb, var(--c) 55%, #fff); }
    @container (max-width: 340px) { .hero { gap: 10px; } .hero .ring { width: 52px; height: 52px; } }
    /* Illustrated header (banner): 90 px, edge to edge, the title on the sky, the house at the right, a 10 px ground
       strip at the bottom. The badge's icon is in the status colour, by day and night. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden;
              background: linear-gradient(180deg, #fff4de 0%, #fbe7c6 100%);
              --bt: #2a2140; --bs: #5a5070; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%); --gr: #d9c39a; }
    .banner.night { background: linear-gradient(180deg, #1f2238 0%, #2b2a4a 100%); --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); --gr: #4a4566; }
    .banner.p-evening { background: linear-gradient(180deg, #ece6fb 0%, #ddd3f5 100%); --gr: #b9acd9; }
    .banner.p-evening.night { background: linear-gradient(180deg, #1c1b33 0%, #29264a 100%); --gr: #3a3560; }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.7); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: var(--gr); }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #4a3f66;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #4a3f66; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    /* Status pill right after the title (see rtPlacePill). */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #2a2140); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* The mini card: the banner alone, its badge a progress ring, the step in progress as its second line. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: 72px; }
    ha-card.bn > .banner .room { right: 34px; }
    .banner .badge .ring { color: var(--bt); }
    .banner .badge:has(.ring) { background: rgba(255,255,255,.7); }
    /* Narrower cards: the house is drawn smaller (75 %, 62 %, then 50 % of its height, its left part cropped). */
    @container (max-width: 420px) { .banner { --sw: 150px; --sk: .75; } }
    @container (max-width: 340px) { .banner { --sw: 112px; --sk: .62; } ha-card.bn > .banner .room { display: none; } ha-card.bn > .banner .head { padding-right: 34px; } }
    @container (max-width: 260px) { .banner { --sw: 70px; --sk: .5; } }
    .banner .evt { all: unset; display: block; min-width: 0; color: var(--bs); font-size: 13px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .banner .evt .tmr { color: inherit; }
    .banner .evt[data-id] { cursor: pointer; }
    .banner .evt:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const rtSchema = (booleans) => (lang) => [
  { name: "title", selector: { text: {} } },
  { name: "subtitle", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  {
    name: "period",
    selector: { select: { mode: "dropdown", options: ["auto", "morning", "evening"].map((value) => ({ value, label: rcT(RT_I18N, lang, `ed_period_${value}`) })) } },
  },
  { name: "deadline", selector: { time: {} } },
  { name: "stars_entity", selector: { entity: { domain: ["counter", "input_number", "sensor"] } } },
  { name: "stars_goal", selector: { number: { min: 1, max: 10, step: 1, mode: "box" } } },
  { name: "reward", selector: { text: {} } },
  { name: "columns", selector: { number: { min: 1, max: 4, step: 1, mode: "box" } } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(RT_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(RT_I18N, lang, "steps", "language"),
];

const RT_HELPERS = ["subtitle", "period", "deadline", "stars_entity", "reward", "zoom", "steps", "language"];

const RoutineCardEditor = rcEditor({
  card: RoutineCard,
  helpers: RT_HELPERS,
  schema: rtSchema(["show_title", "show_subtitle", "illustration", "animations"]),
});

rcRegister(RoutineCard, RoutineCardEditor, "Routine Card", "A routine as illustrated steps: a timer on the step in progress, a progress ring and the week's stars");

// ── Mini card ────────────────────────────────────────────────────────────────
// The routine on two lines: the title and its status, then the step in progress and its timer; the badge is the
// progress ring, and the zoom button opens the full card in place.
class RoutineMiniCard extends rcMini(RoutineCard, "routine-mini-card", "") {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const night = this._night();
    const dark = this._dark();
    const cur = m.current;
    const over = cur?.left != null && cur.left < 0;
    if (!this._changed(["mini", m.done, m.total, m.state, m.left, cur?.id, cur?.start, over, night, dark])) return;
    let text;
    if (m.state === "done") {
      const end = Math.max(...m.steps.map((s) => s.at || 0));
      text = rcEsc(end ? this._t("finished", { t: this._time(end) }) : this._t("all_done"));
    }
    else if (m.state === "empty") text = rcEsc(this._t("no_steps"));
    else if (cur) {
      const timer = cur.start && cur.left != null ? ` · <span class="tmr">${rcEsc(this._timeLeft(cur.left))}</span>` : cur.duration ? ` · ${rcEsc(this._tn("mins", cur.duration, { n: cur.duration }))}` : "";
      text = `${rcEsc(this._name(cur))}${timer}`;
    } else text = rcEsc(this._t("st_idle"));
    const line = `<button class="subt evt"${cur?.entity ? ` data-id="${rcEsc(cur.entity)}"` : ""}>${text}</button>`;
    const ring = rtRing(40, 4, m.fraction, `${m.done}/${m.total}`, this._t("progress_aria", { p: Math.round(m.fraction * 100) }));
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${this._level(m)} st-${m.state} bn${dark ? " dk" : ""}">${this._banner(m, line, ring, true)}</ha-card>`;
    const root = this.shadowRoot;
    if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
    for (const el of root.querySelectorAll(".evt[data-id]")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    this._fitPill();
  }
}

const RoutineMiniCardEditor = rcEditor({
  card: RoutineMiniCard,
  helpers: RT_HELPERS,
  schema: rtSchema(["show_title", "show_subtitle", "illustration", "animations", "zoom"]),
});

rcRegister(RoutineMiniCard, RoutineMiniCardEditor, "Routine Mini Card", "A routine on two lines: its progress ring, the step in progress and its timer, with a zoom to the full card");
