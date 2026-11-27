// ── Routine ──────────────────────────────────────────────────────────────────
// A routine is the list of steps of the config, in order. A step is done when its entity is on (an input_boolean, a
// switch, any entity whose state is "on"); the step in progress is the first one not done. Its timer starts when the
// step before it was done (that entity's last change), so it needs nothing but the step entities.

// The step list from the config: `{ entity, name, icon, duration }` items, or entity ids.
export const rtSteps = (config) =>
  (Array.isArray(config?.steps) ? config.steps : [])
    .map((s) => (typeof s === "string" ? { entity: s } : s))
    .filter((s) => s && typeof s === "object")
    .map((s, i) => ({
      id: s.entity || `step-${i + 1}`,
      entity: typeof s.entity === "string" ? s.entity : null,
      name: s.name ? String(s.name) : "",
      icon: s.icon ? String(s.icon) : "",
      duration: Math.max(0, Number(s.duration) || 0),
    }));

// "08:05" or "8:05:00" → minutes after midnight, null when not a time of day.
export const rtMinutes = (text) => {
  const m = String(text ?? "").match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

// The local midnight of `t` (ms).
export const rtMidnight = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// "1:20", "12:05" for a number of seconds (rounded up, so that 0:00 only shows once it is reached).
export const rtClock = (secs) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Every step with its state, the step in progress, its timer and the routine's status, at `now`.
// `period`: morning or evening ("auto": morning until 3 pm).
export const rtModel = (hass, config, now) => {
  const steps = rtSteps(config).map((s, i) => {
    const st = s.entity ? hass.states?.[s.entity] : undefined;
    const changed = st ? Date.parse(st.last_changed) : NaN;
    return {
      ...s,
      index: i,
      name: s.name || st?.attributes?.friendly_name || "",
      icon: s.icon || st?.attributes?.icon || "",
      unavailable: !!s.entity && (!st || st.state === "unavailable" || st.state === "unknown"),
      done: st?.state === "on",
      at: Number.isFinite(changed) ? changed : null,
    };
  });
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done && !s.unavailable) ?? null;
  if (current) {
    current.current = true;
    // Started when the step before it was done, today.
    const prev = steps[current.index - 1];
    const start = prev?.done && prev.at && prev.at >= rtMidnight(now) ? prev.at : null;
    current.start = start;
    current.left = current.duration ? current.duration * 60 - (start ? (now - start) / 1000 : 0) : null;
  }
  // Minutes left: the current step's time left (whole minutes) and the whole duration of those after it.
  const left = steps.reduce((sum, s) => (s.done ? sum : s.current && s.left != null ? sum + Math.max(0, Math.ceil(s.left / 60)) : sum + s.duration), 0);
  const due = rtMinutes(config.deadline);
  const minutes = Math.floor((now - rtMidnight(now)) / 60000);
  const late = due != null && done < total && minutes >= due;
  const period = config.period === "morning" || config.period === "evening" ? config.period : minutes < 15 * 60 ? "morning" : "evening";
  const state = !total ? "empty" : done === total ? "done" : late ? "late" : done ? "progress" : "idle";
  return { steps, total, done, current, left, due, late, period, state, fraction: total ? done / total : 0 };
};
