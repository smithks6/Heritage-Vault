// Gate 1 spike: lay out the awkward family in family-chart and d3-dag and
// report, for each library, what is actually placed on screen.
//   node spikes/tree/layout-check.mjs
import * as f3 from "family-chart";
import * as dag from "d3-dag";
import { people, units } from "./family.mjs";

const byId = Object.fromEntries(people.map((p) => [p.id, p]));

// ── family-chart: per-person rels, no family-unit record, no adoption flag ──
function toFamilyChart() {
  const rel = Object.fromEntries(people.map((p) => [p.id, { parents: [], spouses: [], children: [] }]));
  for (const u of units) {
    const [a, b] = u.partners;
    if (b) { rel[a].spouses.push(b); rel[b].spouses.push(a); }
    for (const [c] of u.children) {
      for (const p of u.partners) { rel[p].children.push(c); rel[c].parents.push(p); }
    }
  }
  return people.map((p) => ({ id: p.id, data: { gender: p.gender, name: p.name }, rels: rel[p.id] }));
}

function familyChart(main_id) {
  const tree = f3.calculateTree(toFamilyChart(), { main_id, show_siblings_of_main: true });
  const shown = new Set(tree.data.map((d) => d.data.id));
  const missing = people.map((p) => p.id).filter((id) => !shown.has(id));
  const dup = tree.data.length - shown.size;
  return { main_id, shown: shown.size, missing, duplicated_cards: dup };
}

console.log("── family-chart 0.9.0 ──");
for (const main of ["kyle", "james", "emma", "ruth"]) console.log(familyChart(main));

// ── d3-dag: people and family units are both nodes ──
function d3dag() {
  const links = [];
  for (const u of units) {
    for (const p of u.partners) links.push([p, u.id]);
    for (const [c, kind] of u.children) links.push([u.id, c, kind]);
  }
  const builder = dag.graphConnect().sourceId(([s]) => s).targetId(([, t]) => t);
  const g = builder(links);
  const layout = dag.sugiyama()
    .layering(dag.layeringSimplex())
    .decross(dag.decrossTwoLayer())
    .coord(dag.coordQuad())
    .nodeSize([60, 40]);
  const { width, height } = layout(g);
  const rows = {};
  for (const n of g.nodes()) {
    const id = n.data;
    (rows[n.y] ??= []).push([n.x, byId[id] ? byId[id].name : `·${id.replace("f-", "")}`]);
  }
  const shown = [...g.nodes()].filter((n) => byId[n.data]).length;
  const adoptedEdges = [...g.links()].filter((l) => l.data[2] === "adopted")
    .map((l) => `${l.source.data} -> ${l.target.data}`);
  return { width, height, shown, rows, adoptedEdges };
}

console.log("\n── d3-dag 1.2.2 (sugiyama, simplex layering) ──");
const r = d3dag();
console.log({ size: [r.width, r.height], people_shown: r.shown, of: people.length, adopted_edges: r.adoptedEdges });
for (const y of Object.keys(r.rows).map(Number).sort((a, b) => a - b)) {
  console.log(String(y).padStart(4), r.rows[y].sort((a, b) => a[0] - b[0]).map(([, n]) => n).join("  "));
}
