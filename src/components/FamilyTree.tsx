"use client";

/**
 * FamilyTree — visual family tree renderer.
 *
 * Sprint 1 note: This is a CSS-grid placeholder that correctly models the
 * GEDCOM data shape (people + family_units) and passes Gate 1 requirements.
 * Sprint 6 spike will replace the layout engine with `family-chart` or
 * `d3-dag` based on the Week 3 verdict (remarriage + adopted-child test).
 *
 * Design: generations as horizontal rows, family units as vertical connectors.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { User, Mic, ChevronRight } from "lucide-react";
import type { FamilyGraph, FamilyNode } from "@/types";

interface Props {
  graph: FamilyGraph;
}

export default function FamilyTreeView({ graph }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null);

  // Assign generation depths via BFS from root nodes
  const generations = useMemo(() => computeGenerations(graph), [graph]);

  const maxGen = Math.max(...Object.values(generations), 0);
  const nodeById: Record<string, FamilyNode> = {};
  for (const n of graph.nodes) nodeById[n.id] = n;

  // Group people by generation
  const byGen: FamilyNode[][] = [];
  for (let g = 0; g <= maxGen; g++) {
    byGen[g] = graph.nodes.filter((n) => generations[n.id] === g);
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-bark-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-bark-600 inline-block" />
          Member
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          Light contributor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-parchment-400 inline-block" />
          Remembered
        </span>
      </div>

      {/* Tree — horizontal scroll for wide families */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max space-y-8">
          {byGen.map((nodes, gen) => (
            <div key={gen}>
              <div className="text-xs text-bark-400 mb-3 font-medium uppercase tracking-wide">
                Generation {gen + 1}
              </div>
              <div className="flex flex-wrap gap-3">
                {nodes.map((node) => (
                  <PersonCard
                    key={node.id}
                    node={node}
                    isHighlighted={highlight === node.id}
                    onHover={setHighlight}
                    units={graph.units.filter(
                      (u) =>
                        u.partners.includes(node.id) ||
                        u.children.includes(node.id)
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Family units — relationship summary */}
      {graph.units.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-bark-400 hover:text-bark-600 transition-colors select-none">
            {graph.units.length} family unit{graph.units.length !== 1 ? "s" : ""} ↓
          </summary>
          <div className="mt-3 space-y-2">
            {graph.units.map((unit) => {
              const partnerNodes = unit.partners.map((id) => nodeById[id]).filter(Boolean);
              const childNodes = unit.children.map((id) => nodeById[id]).filter(Boolean);
              return (
                <div key={unit.id} className="card text-sm">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {partnerNodes.map((n, i) => (
                      <span key={n.id}>
                        {i > 0 && <span className="text-bark-400 mx-1">&amp;</span>}
                        <Link
                          href={`/person/${n.id}`}
                          className="font-medium text-bark-700 hover:text-amber-700"
                        >
                          {n.person.given_name} {n.person.family_name ?? ""}
                        </Link>
                      </span>
                    ))}
                    {unit.marriage_year && (
                      <span className="badge badge-gray ml-1">m. {unit.marriage_year}</span>
                    )}
                  </div>
                  {childNodes.length > 0 && (
                    <div className="mt-1 text-bark-500 text-xs">
                      Children:{" "}
                      {childNodes.map((n, i) => (
                        <span key={n.id}>
                          {i > 0 && ", "}
                          <Link
                            href={`/person/${n.id}`}
                            className="hover:text-amber-700 transition-colors"
                          >
                            {n.person.given_name}
                          </Link>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Person card
// ─────────────────────────────────────────────

function PersonCard({
  node,
  isHighlighted,
  onHover,
}: {
  node: FamilyNode;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
  units: Array<{ id: string }>;
}) {
  const tierColor = {
    member: "bg-bark-600",
    light_contributor: "bg-amber-500",
    remembered: "bg-parchment-400",
  }[node.person.tier];

  const years = [
    node.person.birth_year,
    node.person.is_deceased && node.person.death_year ? node.person.death_year : null,
  ]
    .filter(Boolean)
    .join("–");

  return (
    <Link
      href={`/person/${node.id}`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className={`group block rounded-xl border p-3 w-40 transition-all duration-150 ${
        isHighlighted
          ? "border-amber-400 shadow-md bg-parchment-50"
          : "border-parchment-300 bg-parchment-50 hover:border-amber-300 hover:shadow-sm"
      }`}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <div className="w-12 h-12 rounded-full bg-parchment-300 flex items-center justify-center mx-auto overflow-hidden">
          {node.person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.person.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-bark-400" />
          )}
        </div>
        {/* Tier dot */}
        <span
          className={`absolute bottom-0 right-[calc(50%-24px)] w-3 h-3 rounded-full border-2 border-white ${tierColor}`}
        />
      </div>

      {/* Name */}
      <p className="text-center text-sm font-medium text-bark-700 leading-tight truncate">
        {node.person.given_name}
      </p>
      {node.person.family_name && (
        <p className="text-center text-xs text-bark-500 truncate">{node.person.family_name}</p>
      )}

      {/* Years */}
      {years && (
        <p className="text-center text-xs text-bark-400 mt-0.5">{years}</p>
      )}

      {/* Recordings count */}
      {node.recordings_count > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
          <Mic className="w-3 h-3" />
          {node.recordings_count}
        </div>
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────
// Generation depth via BFS
// ─────────────────────────────────────────────

function computeGenerations(graph: FamilyGraph): Record<string, number> {
  const gen: Record<string, number> = {};
  const childOf: Record<string, string[]> = {};

  // Build child → family_unit mappings
  for (const unit of graph.units) {
    for (const childId of unit.children) {
      childOf[childId] = [...(childOf[childId] ?? []), unit.id];
    }
  }

  // Build parent lookup: person → parent people (via family units)
  const parentOf: Record<string, string[]> = {};
  for (const unit of graph.units) {
    for (const childId of unit.children) {
      parentOf[childId] = [...(parentOf[childId] ?? []), ...unit.partners];
    }
  }

  // BFS from roots (nodes with no parents)
  const roots = graph.nodes
    .map((n) => n.id)
    .filter((id) => !parentOf[id] || parentOf[id].length === 0);

  const queue = roots.map((id) => ({ id, g: 0 }));
  for (const { id, g } of queue) {
    if (gen[id] !== undefined) continue;
    gen[id] = g;
    // Find children of this person
    for (const unit of graph.units) {
      if (unit.partners.includes(id)) {
        for (const childId of unit.children) {
          if (gen[childId] === undefined) {
            queue.push({ id: childId, g: g + 1 });
          }
        }
      }
    }
  }

  // Assign any unvisited nodes (disconnected)
  for (const n of graph.nodes) {
    if (gen[n.id] === undefined) gen[n.id] = 0;
  }

  return gen;
}
