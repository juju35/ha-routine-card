// The mock home of the screenshots and animations: a morning routine of six steps and an evening one, on
// input_boolean helpers, and a counter of the week's stars. The clock is fixed, so that a capture only changes when the
// card does.
const at = (h, m) => new Date(2026, 10, 27, h, m).getTime();
const st = (entity_id, state, attributes = {}, changed = at(6, 0)) => ({ entity_id, state, attributes, last_changed: new Date(changed).toISOString() });

const MORNING = [
  ["get_up", "Get up", "mdi:bed-clock", 5, at(7, 10)],
  ["dress", "Get dressed", "mdi:tshirt-crew", 10, at(7, 22)],
  ["breakfast", "Breakfast", "mdi:food-croissant", 15, at(7, 41)],
  ["teeth", "Brush teeth", "mdi:toothbrush", 3, at(7, 47)],
  ["bag", "Pack the bag", "mdi:bag-personal", 5, at(7, 53)],
  ["shoes", "Shoes on", "mdi:shoe-sneaker", 3, at(7, 58)],
];
const EVENING = [
  ["dinner", "Dinner", "mdi:silverware-fork-knife", 30, at(19, 30)],
  ["bath", "Bath", "mdi:bathtub", 20, at(20, 2)],
  ["pyjamas", "Pyjamas", "mdi:tshirt-v", 5, at(20, 9)],
  ["brush", "Brush teeth", "mdi:toothbrush", 3, at(20, 13)],
  ["story", "Story time", "mdi:book-open-variant", 15, at(20, 30)],
  ["lights", "Lights out", "mdi:lightbulb-night", 2, at(20, 32)],
];

// Every icon of the mock steps, for the screenshots' <ha-icon> stand-in.
export const ICONS = [...MORNING, ...EVENING].map((s) => s[2]);

// `scene`: progress (three steps done, brushing teeth), idle (nothing done yet), late (past the due time), done (every
// step done), evening (the evening routine, three steps done).
const SCENES = {
  progress: { now: at(7, 43), steps: MORNING, done: 3 },
  idle: { now: at(7, 0), steps: MORNING, done: 0 },
  late: { now: at(8, 7), steps: MORNING, done: 4 },
  done: { now: at(8, 1), steps: MORNING, done: 6 },
  evening: { now: at(20, 11), steps: EVENING, done: 3, config: { title: "Evening routine", deadline: "20:45", reward: "Extra story on Sunday" } },
};

// The page's clock, as script source: window.Date fixed at the scene's time.
export const pageScript = (scene) => `(() => {
  const N = ${SCENES[scene].now};
  const R = Date;
  window.Date = class extends R {
    constructor(...a) { super(...(a.length ? a : [N])); }
    static now() { return N; }
  };
})();`;

export const setup = (s) => {
  const v = SCENES[s.scene];
  const states = Object.fromEntries(
    v.steps.map(([id, name, , , time], i) => {
      const e = `input_boolean.routine_${id}`;
      return [e, st(e, i < v.done ? "on" : "off", { friendly_name: name }, i < v.done ? time : at(6, 0))];
    }),
  );
  states["counter.routine_stars"] = st("counter.routine_stars", "4", { friendly_name: "Stars this week" });
  return {
    hass: { language: "en", locale: { language: "en" }, states },
    config: {
      steps: v.steps.map(([id, name, icon, duration]) => ({ entity: `input_boolean.routine_${id}`, name, icon, duration })),
      stars_entity: "counter.routine_stars",
      reward: "Movie night on Friday",
      deadline: "08:05",
      ...v.config,
      ...s.config,
    },
    open: s.open,
  };
};
