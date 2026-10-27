import type { ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { tr, useLang } from "@/i18n";
import { font, useTheme, type Palette } from "./theme";

const variants = {
  display: { fontFamily: font.heavy, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: font.heavy, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: font.bold, fontSize: 17, lineHeight: 23, letterSpacing: -0.1 },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: "uppercase" },
} satisfies Record<string, TextStyle>;

type Props = TextProps & {
  v?: keyof typeof variants;
  color?: keyof Palette | (string & {});
  /** Tabular digits, for times and money. */
  num?: boolean;
  center?: boolean;
};

/**
 * Children in the chosen language: a lone string is looked up whole, and a run
 * of strings and numbers is joined first so sentences with times ("Chart
 * around 28 Oct 12:50") still match their translation.
 */
function translate(children: ReactNode, lang: ReturnType<typeof useLang>["lang"]): ReactNode {
  if (typeof children === "string") return tr(children, lang);
  if (!Array.isArray(children)) return children;
  const simple = children.filter((c) => c !== null && c !== undefined && c !== false);
  if (simple.every((c) => typeof c === "string" || typeof c === "number")) return tr(simple.join(""), lang);
  return children.map((c) => (typeof c === "string" ? tr(c, lang) : c));
}

/** Every piece of text in the app. color takes a palette key or a raw colour. */
export function T({ v = "body", color = "text", num, center, style, children, ...rest }: Props) {
  const c = useTheme();
  const { lang } = useLang();
  const col = (c as Record<string, unknown>)[color];
  // Manrope has no Devanagari or Gujarati glyphs, so those languages use the phone's own font.
  const variant = lang === "en" ? variants[v] : { ...variants[v], fontFamily: undefined };
  return (
    <Text
      {...rest}
      style={[
        variant,
        { color: typeof col === "string" ? col : color },
        num && { fontVariant: ["tabular-nums"] },
        center && { textAlign: "center" },
        style,
      ]}
    >
      {translate(children, lang)}
    </Text>
  );
}
