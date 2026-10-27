import { DICT } from "./dict";
import { NAMES } from "./names";

/**
 * The translation engine: English -> Hindi/Gujarati. No React and no storage,
 * so it also runs in tests and plain helpers (confirm, placeholders).
 */

export type Lang = "en" | "hi" | "gu";

export const LANGS: { value: Lang; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
  { value: "gu", label: "Gujarati", native: "ગુજરાતી" },
];

/** The language in use, for plain functions that can't call a hook (e.g. confirm). */
let active: Lang = "en";
export const activeLang = () => active;
export const setActiveLang = (l: Lang) => {
  active = l;
};

/** index: english -> [hindi, gujarati] */
type Entry = [string, string];

const plain: Record<Lang, Map<string, string>> = { en: new Map(), hi: new Map(), gu: new Map() };
const templates: Record<Lang, { re: RegExp; tpl: string }[]> = { en: [], hi: [], gu: [] };

// Longest literal first, so "Next stop Kamakhya at 00:35" wins over a shorter pattern.
const build = (lang: Lang) => {
  if (plain[lang].size) return;
  const withTokens: { key: string; tpl: string }[] = [];
  for (const [key, val] of Object.entries(DICT as Record<string, Entry>)) {
    const tpl = lang === "hi" ? val[0] : val[1];
    if (!tpl) continue;
    if (key.includes("{")) withTokens.push({ key, tpl });
    else plain[lang].set(key, tpl);
  }
  templates[lang] = withTokens
    .sort((a, b) => b.key.length - a.key.length)
    .map(({ key, tpl }) => {
      const parts = key.split(/\{\d+\}/g).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return { re: new RegExp(`^${parts.join("(.+?)")}$`), tpl };
    });
};
for (const lang of ["en", "hi", "gu"] as Lang[]) build(lang);

const memo = new Map<string, string>();

/** Place names, longest first, so "New Delhi" is swapped before "Delhi". */
const places: Record<"hi" | "gu", [RegExp, string][]> = { hi: [], gu: [] };
for (const line of NAMES.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [en, hi, gu] = t.split("|");
  if (!en || !hi || !gu) continue;
  const re = new RegExp(`\\b${en.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  places.hi.push([re, hi.trim()]);
  places.gu.push([re, gu.trim()]);
}
places.hi.sort((a, b) => b[1].length - a[1].length);
places.gu.sort((a, b) => b[1].length - a[1].length);

function localizeNames(text: string, lang: "hi" | "gu") {
  let out = text;
  for (const [re, name] of places[lang]) {
    re.lastIndex = 0;
    out = out.replace(re, name);
  }
  return out;
}

function find(core: string, lang: Lang): string | undefined {
  const direct = plain[lang].get(core);
  if (direct) return direct;
  for (const { re, tpl } of templates[lang]) {
    const m = re.exec(core);
    if (!m) continue;
    return tpl.replace(/\{(\d+)\}/g, (_, n: string) => m[Number(n) + 1] ?? m[Number(n)] ?? "");
  }
  return undefined;
}

/** English -> the chosen language. Unknown text (dates, codes, names) comes back unchanged. */
export function tr(text: string, lang: Lang): string {
  if (lang === "en" || !text) return text;
  const cacheKey = `${lang}\u0000${text}`;
  const hit = memo.get(cacheKey);
  if (hit !== undefined) return hit;
  const core = text.trim();
  let out = text;
  if (core) {
    const found = find(core, lang);
    if (found) {
      const lead = text.slice(0, text.length - text.trimStart().length);
      const tail = text.slice(text.trimEnd().length);
      out = `${lead}${found}${tail}`;
    }
    out = localizeNames(out, lang);
  }
  memo.set(cacheKey, out);
  return out;
}
