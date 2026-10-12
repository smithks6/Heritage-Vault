// Follow-up: does an exact crossing minimiser keep partners adjacent?
//   node spikes/tree/decross-check.mjs
import * as dag from "d3-dag";
import { people, units } from "./family.mjs";

const byId = Object.fromEntries(people.map((p) => [p.id, p]));
const links = [];
for (const u of units) {
  for (const p of u.partners) links.push([p, u.id]);
  for (const [c] of u.children) links.push([u.id, c]);
}

for (const [name, decross] of [["twoLayer", dag.decrossTwoLayer()], ["opt", dag.decrossOpt()]]) {
  const g = dag.graphConnect().sourceId(([s]) => s).targetId(([, t]) => t)(links);
  const t0 = performance.now();
  dag.sugiyama().layering(dag.layeringSimplex()).decross(decross).coord(dag.coordQuad()).nodeSize([60, 40])(g);
  const ms = (performance.now() - t0).toFixed(1);
  const x = Object.fromEntries([...g.nodes()].map((n) => [n.data, n]));
  // Partners are adjacent if no other person sits between them on their row.
  const split = units.filter(({ partners: [a, b] }) => {
    const lo = Math.min(x[a].x, x[b].x), hi = Math.max(x[a].x, x[b].x);
    return [...g.nodes()].some((n) => byId[n.data] && n.y === x[a].y && n.x > lo && n.x < hi && n.data !== a && n.data !== b);
  }).map((u) => u.partners.join("+"));
  const crossings = [...g.links()].reduce((acc, l, i, all) => acc + all.slice(i + 1).filter((m) =>
    l.source.y === m.source.y && (l.source.x - m.source.x) * (l.target.x - m.target.x) < 0).length, 0);
  console.log({ decross: name, ms, crossings, partners_split_by_someone: split });
}
