"use client";

/**
 * FamilyTree — generation rows with SVG connector lines.
 *
 * Layout: people grouped into generation rows, partners ordered adjacently.
 * After mount, DOM positions are measured and SVG lines are drawn for:
 *   - Couple connections (amber horizontal line between partners)
 *   - Parent→child branches (parchment lines dropping to children)
 */

import { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { User, Mic } from "lucide-react";
import type { FamilyGraph, FamilyNode } from "@/types";

interface Props {
  graph: FamilyGraph;
}

interface LineSpec {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "partner" | "branch";
}

export default function FamilyTreeView({ graph }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSpec[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  // Generation depth via BFS from roots
  const generations = useMemo(() => computeGenerations(graph), [graph]);
  const maxGen = Math.max(...Object.values(generations), 0);

  // Group people per generation, with partners placed adjacently
  const byGen = useMemo(() => {
    const rows: FamilyNode[][] = [];
    for (let g = 0; g <= maxGen; g++) {
      const genPeople = graph.nodes.filter((n) => generations[n.id] === g);
      rows[g] = orderPartnersAdjacent(genPeople, graph);
    }
    return rows;
  }, [graph, generations, maxGen]);

  // Measure DOM positions → compute SVG lines
  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    setSvgSize({ w: cRect.width, h: cRect.height });

    const newLines: LineSpec[] = [];

    function cardRect(personId: string): DOMRect | null {
      const el = container!.querySelector<HTMLElement>(`[data-pid="${personId}"]`);
      return el ? el.getBoundingClientRect() : null;
    }

    for (const unit of graph.units) {
      if (unit.partners.length < 2) continue;

      const partnerRects = unit.partners
        .map((id) => cardRect(id))
        .filter((r): r is DOMRect => r !== null);
      if (partnerRects.length < 2) continue;

      partnerRects.sort((a, b) => a.left - b.left);
      const leftR = partnerRects[0];
      const rightR = partnerRects[partnerRects.length - 1];

      const py = (leftR.top + leftR.bottom) / 2 - cRect.top;
      const lx = leftR.right - cRect.left;
      const rx = rightR.left - cRect.left;
      const coupleX = (leftR.left + leftR.right + rightR.left + rightR.right) / 4 - cRect.left;

      // Horizontal couple line
      newLines.push({ x1: lx, y1: py, x2: rx, y2: py, type: "partner" });

      if (unit.children.length === 0) continue;

      const childRects = unit.children
        .map((id) => cardRect(id))
        .filter((r): r is DOMRect => r !== null);
      if (childRects.length === 0) continue;

      childRects.sort((a, b) => a.left - b.left);

      const childTopY = Math.min(...childRects.map((r) => r.top)) - cRect.top;
      const midY = py + (childTopY - py) * 0.5;

      // Vertical drop from couple centre
      newLines.push({ x1: coupleX, y1: py, x2: coupleX, y2: midY, type: "branch" });

      // Horizontal branch spanning children
      const bLeft = (childRects[0].left + childRects[0].right) / 2 - cRect.left;
      const bRight =
        (childRects[childRects.length - 1].left + childRects[childRects.length - 1].right) / 2 -
        cRect.left;

      const branchL = Math.min(bLeft, coupleX);
      const branchR = Math.max(bRight, coupleX);
      newLines.push({ x1: branchL, y1: midY, x2: branchR, y2: midY, type: "branch" });

      // Vertical drops to each child
      for (const cr of childRects) {
        const cx = (cr.left + cr.right) / 2 - cRect.left;
        const cy = cr.top - cRect.top;
        newLines.push({ x1: cx, y1: midY, x2: cx, y2: cy, type: "branch" });
      }
    }

    setLines(newLines);
  }, [graph]);

  useLayoutEffect(() => {
    const run = () => setTimeout(computeLines, 30);
    run();
    const ro = new ResizeObserver(run);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeLines, byGen]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-bark-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-bark-600 inline-block" />
          Member
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          Contributor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-parchment-400 inline-block" />
          Remembered
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-6 h-0.5 bg-amber-500" />
          Partners
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-parchment-400" />
          Parent–child
        </span>
      </div>

      {/* Tree canvas */}
      <div className="overflow-x-auto pb-6">
        <div ref={containerRef} className="relative min-w-max">
          {/* SVG connector overlay */}
          {svgSize.w > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={svgSize.w}
              height={svgSize.h}
              aria-hidden="true"
            >
              {lines.map((ln, i) => (
                <line
                  key={i}
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke={ln.type === "partner" ? "#d97706" : "#c4b49a"}
                  strokeWidth={ln.type === "partner" ? 2 : 1.5}
                  strokeLinecap="round"
                />
              ))}
            </svg>
          )}

          {/* Generation rows */}
          <div className="space-y-16">
            {byGen.map((nodes, gen) => (
              <div key={gen}>
                <div className="text-xs text-bark-400 mb-4 font-medium uppercase tracking-wide">
                  Generation {gen + 1}
                </div>
                <div className="flex flex-wrap gap-5">
                  {nodes.map((node) => (
                    <PersonCard
                      key={node.id}
                      node={node}
                      isHighlighted={highlight === node.id}
                      onHover={setHighlight}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Person card ─────────────────────────────────────────────────────────────

function PersonCard({
  node,
  isHighlighted,
  onHover,
}: {
  node: FamilyNode;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
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
      data-pid={node.id}
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
        <span
          className={`absolute bottom-0 right-[calc(50%-24px)] w-3 h-3 rounded-full border-2 border-white ${tierColor}`}
        />
      </div>

      <p className="text-center text-sm font-medium text-bark-700 leading-tight truncate">
        {node.person.given_name}
      </p>
      {node.person.family_name && (
        <p className="text-center text-xs text-bark-500 truncate">{node.person.family_name}</p>
      )}
      {years && <p className="text-center text-xs text-bark-400 mt-0.5">{years}</p>}
      {node.recordings_count > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
          <Mic className="w-3 h-3" />
          {node.recordings_count}
        </div>
      )}
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeGenerations(graph: FamilyGraph): Record<string, number> {
  const gen: Record<string, number> = {};
  const parentOf: Record<string, string[]> = {};

  for (const unit of graph.units) {
    for (const childId of unit.children) {
      parentOf[childId] = [...(parentOf[childId] ?? []), ...unit.partners];
    }
  }

  const roots = graph.nodes
    .map((n) => n.id)
    .filter((id) => !parentOf[id] || parentOf[id].length === 0);

  const queue: { id: string; g: number }[] = roots.map((id) => ({ id, g: 0 }));
  for (let i = 0; i < queue.length; i++) {
    const { id, g } = queue[i];
    if (gen[id] !== undefined) continue;
    gen[id] = g;
    for (const unit of graph.units) {
      if (unit.partners.includes(id)) {
        for (const childId of unit.children) {
          if (gen[childId] === undefined) queue.push({ id: childId, g: g + 1 });
        }
      }
    }
  }

  for (const n of graph.nodes) {
    if (gen[n.id] === undefined) gen[n.id] = 0;
  }

  return gen;
}

/** Within a generation, sort so that partners from the same family unit are adjacent. */
function orderPartnersAdjacent(people: FamilyNode[], graph: FamilyGraph): FamilyNode[] {
  const placed = new Set<string>();
  const result: FamilyNode[] = [];

  for (const unit of graph.units) {
    const inGen = unit.partners.filter((id) => people.some((p) => p.id === id));
    if (inGen.length >= 2) {
      for (const pid of inGen) {
        if (!placed.has(pid)) {
          const node = people.find((p) => p.id === pid);
          if (node) { result.push(node); placed.add(pid); }
        }
      }
    }
  }

  for (const person of people) {
    if (!placed.has(person.id)) {
      result.push(person);
      placed.add(person.id);
    }
  }

  return result;
}
