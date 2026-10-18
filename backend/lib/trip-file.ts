import "server-only";
import ts from "typescript";

/** Where the trip plan lives in the repo (edited from the app's developer options). */
export const TRIP_PATH = "backend/data/trip.ts";

/**
 * Checks an edited trip.ts before it is committed: it must parse, run, and
 * still export the trip's main lists with valid dates. Type errors aren't
 * caught here; if one slips through, Vercel's build fails and the last good
 * version stays live. Returns a plain-English problem, or null if it looks fine.
 */
export function checkTripSource(text: string): string | null {
  const out = ts.transpileModule(text, {
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const diag = out.diagnostics?.[0];
  if (diag) {
    const where = diag.file && diag.start !== undefined ? diag.file.getLineAndCharacterOfPosition(diag.start) : null;
    return `${where ? `Line ${where.line + 1}: ` : ""}${ts.flattenDiagnosticMessageText(diag.messageText, "\n")}`;
  }
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  try {
    // The file has no imports; this only runs Om's own trip data.
    new Function("exports", "module", "require", out.outputText)(mod.exports, mod, () => {
      throw new Error("trip.ts can't import other files");
    });
  } catch (e) {
    return `The file doesn't run: ${e instanceof Error ? e.message : String(e)}`;
  }
  const t = mod.exports;
  for (const name of ["TEAM", "LEGS", "BACKUPS", "PLACES", "EVENT"]) if (!t[name]) return `${name} is missing`;
  type LegLike = { id?: string; depart?: string; arrive?: string };
  const legs = [...(t.LEGS as LegLike[]), ...(t.BACKUPS as LegLike[])];
  for (const l of legs) {
    if (!l.id) return "A leg has no id";
    if (Number.isNaN(Date.parse(l.depart ?? "")) || Number.isNaN(Date.parse(l.arrive ?? ""))) {
      return `Leg ${l.id}: depart and arrive must be dates like 2026-10-29T07:22:00+05:30`;
    }
  }
  return null;
}
