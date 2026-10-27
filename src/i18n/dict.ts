/**
 * Translations for every visible string: English|हिन्दी|ગુજરાતી.
 *
 * The English side must match the string the app renders (it is the key).
 * Entries may use {0}, {1} for values the app fills in ("{0} min late"), so a
 * sentence built in code still gets translated. Anything missing here is shown
 * in English, so a gap never breaks a screen. Translations live in
 * dict-ui.ts, dict-data.ts and dict-live.ts, joined below.
 */
import { DATA } from "./dict-data";
import { LIVE } from "./dict-live";
import { UI } from "./dict-ui";

export type Entry = [string, string];

const RAW = [UI, DATA, LIVE].join("\n");

export const DICT: Record<string, Entry> = {};

for (const line of RAW.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const parts = t.split("|");
  if (parts.length < 3) continue;
  const [en, hi, gu] = parts;
  if (!en.trim() || !hi.trim() || !gu.trim()) continue;
  DICT[en.trim()] = [hi.trim(), gu.trim()];
}
