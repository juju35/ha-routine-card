// Renders the routine cards with a mock routine and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/routine.mjs
import { pair, shoot } from "./harness.mjs";
import { ICONS, pageScript, setup } from "./mock.mjs";

// Stills: animations: false stops the sun's glow, the stars and the sparkles, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
for (const scene of ["progress", "idle", "late", "done", "evening"]) {
  await shoot({ prefix: "rt", tag: "routine-card", shots: still(scene, { scene }), setup, icons: ICONS, ws: pageScript(scene) });
}
await shoot({ prefix: "rt", tag: "routine-card", shots: still("narrow", { scene: "progress", width: 300 }), setup, icons: ICONS, ws: pageScript("progress") });
await shoot({ prefix: "rt-mini", tag: "routine-mini-card", shots: [...still("progress", { scene: "progress" }), ...still("zoom", { scene: "progress", open: ".zoom" })], setup, icons: ICONS, ws: pageScript("progress") });
await shoot({ prefix: "rt-mini", tag: "routine-mini-card", shots: still("done", { scene: "done" }), setup, icons: ICONS, ws: pageScript("done") });
