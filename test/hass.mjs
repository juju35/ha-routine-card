// A mock Home Assistant with a morning routine of six steps (input_boolean helpers) and a counter of stars. The time
// is fixed by the tests (NOW): 27 November 2026, 7:50 local time; three steps done, the fourth started at 7:41.
export const at = (h, m) => new Date(2026, 10, 27, h, m).getTime();
export const NOW = at(7, 50);

export const st = (entity_id, state, attributes = {}, changed = at(6, 0)) => ({
  entity_id,
  state,
  attributes,
  last_changed: new Date(changed).toISOString(),
});

export const STEPS = [
  { entity: "input_boolean.routine_get_up", name: "Get up", icon: "mdi:bed-clock", duration: 5 },
  { entity: "input_boolean.routine_dress", name: "Get dressed", icon: "mdi:tshirt-crew", duration: 10 },
  { entity: "input_boolean.routine_breakfast", name: "Breakfast", icon: "mdi:food-croissant", duration: 15 },
  { entity: "input_boolean.routine_teeth", name: "Brush teeth", icon: "mdi:toothbrush", duration: 10 },
  { entity: "input_boolean.routine_bag", name: "Pack the bag", icon: "mdi:bag-personal", duration: 5 },
  { entity: "input_boolean.routine_shoes", name: "Shoes on", icon: "mdi:shoe-sneaker", duration: 3 },
];

// `done`: how many of the steps are on (in order).
export const makeHass = ({ done = 3, ...overrides } = {}) => {
  const times = [at(7, 10), at(7, 22), at(7, 41), at(7, 52), at(7, 57), at(8, 0)];
  const states = Object.fromEntries(
    STEPS.map((s, i) => [s.entity, st(s.entity, i < done ? "on" : "off", { friendly_name: s.name }, i < done ? times[i] : at(6, 0))]),
  );
  states["counter.routine_stars"] = st("counter.routine_stars", "4", { friendly_name: "Stars" });
  const calls = [];
  return {
    language: "en",
    locale: { language: "en" },
    themes: { darkMode: false },
    states,
    calls,
    callService: async (domain, service, data) => calls.push([domain, service, data]),
    ...overrides,
  };
};
