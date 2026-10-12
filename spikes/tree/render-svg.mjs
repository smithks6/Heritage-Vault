// Render the d3-dag layout of the awkward family to spikes/tree/d3-dag-layout.svg
//   node spikes/tree/render-svg.mjs
import { writeFileSync } from "node:fs";
import * as dag from "d3-dag";
import { people, units } from "./family.mjs";

const byId = Object.fromEntries(people.map((p) => [p.id, p]));
const links = [];
for (const u of units) {
  for (const p of u.partners) links.push([p, u.id]);
  for (const [c, kind] of u.children) links.push([u.id, c, kind]);
}
const g = dag.graphConnect().sourceId(([s]) => s).targetId(([, t]) => t)(links);
const W = 92, H = 34;
const { width, height } = dag.sugiyama()
  .layering(dag.layeringSimplex())
  .decross(dag.decrossOpt())
  .coord(dag.coordQuad())
  .nodeSize((n) => (byId[n.data] ? [W + 16, H + 26] : [8, 18]))(g);

const pad = 20;
const edges = [...g.links()].map((l) => {
  const adopted = l.data[2] === "adopted";
  const [x1, y1, x2, y2] = [l.source.x, l.source.y, l.target.x, l.target.y];
  const my = (y1 + y2) / 2;
  return `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="#5C6B68" stroke-width="1.5"${adopted ? ' stroke-dasharray="5 4"' : ""}/>`
    + (adopted ? `<text x="${x2 + 6}" y="${my}" font-size="10" fill="#A6321F">adopted</text>` : "");
}).join("\n");
const nodes = [...g.nodes()].map((n) => {
  const p = byId[n.data];
  if (!p) return `<circle cx="${n.x}" cy="${n.y}" r="4" fill="#1F6B62"/>`;
  return `<g><rect x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" rx="4" fill="${p.deceased ? "#EDEDE7" : "#FFFFFF"}" stroke="#1F6B62"/>`
    + `<text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-size="13" fill="#16211F">${p.name}${p.deceased ? " †" : ""}</text></g>`;
}).join("\n");

writeFileSync(new URL("./d3-dag-layout.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}" width="${width + 2 * pad}" height="${height + 2 * pad}" font-family="sans-serif">
<rect x="${-pad}" y="${-pad}" width="${width + 2 * pad}" height="${height + 2 * pad}" fill="#F6F5F1"/>
${edges}
${nodes}
</svg>\n`);
console.log(`wrote d3-dag-layout.svg (${Math.round(width)}×${Math.round(height)})`);
