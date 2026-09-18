import { isWithinDir, pathComparisonKey, pathSegmentDepth } from "./paths.js";
const canonical = pathComparisonKey;
const lexicalCompare = (a: string, b: string): number =>
  a === b ? 0 : a < b ? -1 : 1;

export interface DurableProjectRoot {
  projectId: string;
  cwd: string;
}

/**
 * Resolve the most-specific containing durable root with one deterministic
 * browser/server rule. Equal-specificity claims by different projects fail
 * closed; multiple bindings owned by one durable project remain valid.
 */
export function matchProjectRootForPath<T extends DurableProjectRoot>(
  targetPath: string,
  roots: readonly T[],
): ProjectRootMatch<T> {
  const matches = roots.filter((root) => isWithinDir(root.cwd, targetPath));
  if (matches.length === 0) return { kind: "unregistered" };
  const depth = Math.max(...matches.map((root) => pathSegmentDepth(root.cwd)));
  const nearest = matches.filter(
    (root) => pathSegmentDepth(root.cwd) === depth,
  );
  const projectIds = [...new Set(nearest.map((root) => root.projectId))].sort();
  if (projectIds.length !== 1) return { kind: "ambiguous", projectIds };
  return {
    kind: "resolved",
    root: [...nearest].sort(
      (left, right) =>
        lexicalCompare(canonical(left.cwd), canonical(right.cwd)) ||
        lexicalCompare(left.cwd, right.cwd),
    )[0]!,
  };
}

export type ProjectRootMatch<T> =
  | { kind: "resolved"; root: T }
  | { kind: "unregistered" }
  | { kind: "ambiguous"; projectIds: string[] };

export function resolveProjectRootForPath<T extends DurableProjectRoot>(
  targetPath: string,
  roots: readonly T[],
): T | null {
  const match = matchProjectRootForPath(targetPath, roots);
  return match.kind === "resolved" ? match.root : null;
}
