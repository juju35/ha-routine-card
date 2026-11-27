import assert from "node:assert/strict";
import { test } from "node:test";
import { at, makeHass, NOW, STEPS } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const rt = load({ now: NOW });
const { cards } = rt;
const json = (v) => JSON.parse(JSON.stringify(v));
const CONFIG = { steps: STEPS, stars_entity: "counter.routine_stars", reward: "Movie night", deadline: "08:05" };

// A card whose shadow root answers every selector with nodes recording their click listeners.
const make = (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  return { card, nodes, hass };
};

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["routine-card", "routine-mini-card"]) {
    assert.ok(rt.customElements.get(tag), tag);
    assert.ok(rt.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(rt.window.customCards.map((c) => c.type)), ["routine-card", "routine-mini-card"]);
  const stub = json(cards["routine-card"].getStubConfig(makeHass()));
  assert.equal(stub.steps.length, 6);
  assert.equal(stub.steps[0].entity, "input_boolean.routine_get_up");
  assert.equal(json(cards["routine-card"].getStubConfig({ states: {} })).steps.length, 4, "a sample routine without helpers");
});

test("steps: entity ids or objects, durations kept positive", () => {
  const steps = json(rt.rtSteps({ steps: ["input_boolean.a", { name: "Read", duration: -3 }, null, 4] }));
  assert.deepEqual(steps, [
    { id: "input_boolean.a", entity: "input_boolean.a", name: "", icon: "", duration: 0 },
    { id: "step-2", entity: null, name: "Read", icon: "", duration: 0 },
  ]);
  assert.deepEqual(json(rt.rtSteps({})), []);
});

test("times: a due time, a clock, a midnight", () => {
  assert.equal(rt.rtMinutes("08:05"), 485);
  assert.equal(rt.rtMinutes("8:05:00"), 485);
  for (const bad of ["24:00", "8h05", "", null, "7:60"]) assert.equal(rt.rtMinutes(bad), null, String(bad));
  assert.equal(rt.rtClock(80), "1:20");
  assert.equal(rt.rtClock(0.2), "0:01", "rounded up");
  assert.equal(rt.rtClock(-5), "0:00");
  assert.equal(rt.rtMidnight(NOW), at(0, 0));
});

test("model: done steps, the step in progress and its timer from the step before it", () => {
  const m = rt.rtModel(makeHass(), CONFIG, NOW);
  assert.deepEqual([m.total, m.done, m.state, m.period], [6, 3, "progress", "morning"]);
  assert.equal(m.current.name, "Brush teeth");
  assert.equal(m.current.start, at(7, 41), "started when Breakfast was done");
  assert.equal(m.current.left, 60, "10 min minus the 9 spent");
  assert.equal(m.left, 1 + 5 + 3, "1 min left on teeth, then the bag and the shoes");
  assert.equal(m.fraction, 0.5);
});

test("model: not started, all done, late after the due time, evening after 3 pm", () => {
  assert.equal(rt.rtModel(makeHass({ done: 0 }), CONFIG, NOW).state, "idle");
  assert.equal(rt.rtModel(makeHass({ done: 0 }), CONFIG, NOW).current.start, null, "the first step has no start");
  assert.equal(rt.rtModel(makeHass({ done: 6 }), CONFIG, at(8, 30)).state, "done");
  assert.equal(rt.rtModel(makeHass(), CONFIG, at(8, 6)).state, "late");
  assert.equal(rt.rtModel(makeHass(), { ...CONFIG, deadline: undefined }, at(16, 0)).period, "evening");
  assert.equal(rt.rtModel(makeHass(), { ...CONFIG, period: "evening" }, NOW).period, "evening");
  assert.equal(rt.rtModel(makeHass(), { steps: [] }, NOW).state, "empty");
});

test("model: a step done yesterday does not start today's timer", () => {
  const hass = makeHass();
  hass.states["input_boolean.routine_breakfast"].last_changed = new Date(at(7, 41) - 86400000).toISOString();
  assert.equal(rt.rtModel(hass, CONFIG, NOW).current.start, null);
});

test("full card: status pill, hero, tiles, stars and the mark-done button", () => {
  const { card } = make("routine-card", CONFIG);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /lvl-progress/);
  assert.match(html, /3 \/ 6 · 9 min/);
  assert.match(html, /Morning routine/);
  assert.match(html, /Due at 8:05/);
  assert.match(html, /Now: Brush teeth/);
  assert.match(html, /1:00 left/);
  assert.match(html, /then Pack the bag/);
  assert.match(html, /Done · 7:10/);
  assert.match(html, /4 of 5 stars this week/);
  assert.match(html, /Reward: Movie night/);
  assert.match(html, /Mark step done/);
  assert.equal((html.match(/class="tile/g) || []).length, 6);
});

test("full card: the mark-done button turns the step in progress on; a tile tap toggles its step", async () => {
  const { card, nodes, hass } = make("routine-card", CONFIG);
  nodes[".mark"].listeners.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(json(hass.calls.at(-1)), ["homeassistant", "turn_on", { entity_id: "input_boolean.routine_teeth" }]);
  const el = fakeNode();
  card._bindTile(el, card._items[0]);
  el.listeners.keydown({ key: "Enter", preventDefault() {} });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(json(hass.calls.at(-1)), ["homeassistant", "toggle", { entity_id: "input_boolean.routine_get_up" }]);
});

test("full card: all done, late, and no illustration", () => {
  assert.match(make("routine-card", CONFIG, makeHass({ done: 6 })).card.shadowRoot.innerHTML, /All done!/);
  const late = load({ now: at(8, 10) });
  const card = new late.cards["routine-card"]();
  card.attachShadow();
  card.shadowRoot.querySelector = () => fakeNode();
  card.setConfig({ type: "custom:routine-card", ...CONFIG });
  card.hass = makeHass();
  assert.match(card.shadowRoot.innerHTML, /lvl-alert/);
  assert.match(card.shadowRoot.innerHTML, /Late · 3 left/);
  const plain = make("routine-card", { ...CONFIG, illustration: false }).card.shadowRoot.innerHTML;
  assert.doesNotMatch(plain, /class="banner/);
  assert.match(plain, /class="pill"/);
});

test("mini card: the ring, the step in progress and its timer", () => {
  const { card } = make("routine-mini-card", CONFIG);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="ring"/);
  assert.match(html, />3\/6</);
  assert.match(html, /Brush teeth · <span class="tmr">1:00 left/);
  assert.match(html, /3 \/ 6 · 9 min/);
});

test("every language has the English keys of the routine table", () => {
  const en = Object.keys(rt.RT_I18N.en);
  for (const [lang, table] of Object.entries(rt.RT_I18N)) {
    const missing = en.filter((k) => !(k in table) && !/_(one|many)$/.test(k));
    assert.deepEqual(missing, [], lang);
    for (const k of Object.keys(table)) assert.ok(en.includes(k) || /_(zero|two|few)$/.test(k), `${lang}.${k}`);
  }
});

test("the French card speaks French", () => {
  const { card } = make("routine-card", { ...CONFIG, language: "fr" });
  assert.match(card.shadowRoot.innerHTML, /Routine du matin/);
  assert.match(card.shadowRoot.innerHTML, /Valider l&#39;étape/);
});
