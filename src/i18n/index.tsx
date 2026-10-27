import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cacheGet, cacheSet } from "@/core/storage";
import { LANGS, activeLang, setActiveLang, tr, type Lang } from "./translate";

/**
 * App language: English, Hindi or Gujarati. Every visible string goes through
 * tr() (via the T text component and the other UI pieces), which looks the
 * English text up in the dictionaries in ./dict. Unchanged text falls back to
 * English, so a missing entry never breaks a screen.
 */

export type { Lang };
export { LANGS, activeLang, tr };

const KEY = "lang";
const isLang = (v: unknown): v is Lang => v === "en" || v === "hi" || v === "gu";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(activeLang());

  useEffect(() => {
    void cacheGet<Lang>(KEY).then((saved) => {
      if (isLang(saved)) setLangState(saved);
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (l) => {
        setActiveLang(l);
        setLangState(l);
        void cacheSet(KEY, l);
      },
    }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Translate one string into the current language. */
export function useTr() {
  const { lang } = useLang();
  return useMemo(() => (text: string) => tr(text, lang), [lang]);
}
