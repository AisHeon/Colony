import type { GraphData } from "./content";

/**
 * Pure Spider Web route logic. A path is valid when every consecutive pair has
 * one approved direct relationship (either direction, using the stored inverse
 * label) and the chain runs from start to target without repeats.
 */

export type RouteEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  source: string;
  predicate: string;
  direction: "forward" | "inverse";
};

export type RouteResult =
  | { ok: true; edges: RouteEdge[] }
  | { ok: false; reason: "unknown_edge"; at: number }
  | { ok: false; reason: "repeat" }
  | { ok: false; reason: "start" }
  | { ok: false; reason: "incomplete" }
  | { ok: false; reason: "too_long" }
  | { ok: false; reason: "short" };

export function findDirectEdge(graph: GraphData, from: string, to: string): RouteEdge | null {
  for (const edge of graph.edges) {
    if (edge.from_entity === from && edge.to_entity === to) {
      return {
        id: edge.id,
        from,
        to,
        label: edge.forward_label,
        source: edge.source,
        predicate: edge.predicate,
        direction: "forward",
      };
    }
    if (edge.inverse_label && edge.from_entity === to && edge.to_entity === from) {
      return {
        id: edge.id,
        from,
        to,
        label: edge.inverse_label,
        source: edge.source,
        predicate: edge.predicate,
        direction: "inverse",
      };
    }
  }
  return null;
}

export function validateRoute(
  graph: GraphData,
  nodes: string[],
  start: string,
  target: string,
  maxStrands: number,
): RouteResult {
  if (nodes.length < 2) return { ok: false, reason: "short" };
  if (nodes[0] !== start) return { ok: false, reason: "start" };
  if (new Set(nodes).size !== nodes.length) return { ok: false, reason: "repeat" };
  if (nodes.length - 1 > maxStrands) return { ok: false, reason: "too_long" };

  const edges: RouteEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const edge = findDirectEdge(graph, nodes[i], nodes[i + 1]);
    if (!edge) return { ok: false, reason: "unknown_edge", at: i };
    edges.push(edge);
  }
  if (nodes[nodes.length - 1] !== target) return { ok: false, reason: "incomplete" };
  return { ok: true, edges };
}
