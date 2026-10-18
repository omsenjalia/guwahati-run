import { Text, type TextProps, type TextStyle } from "react-native";
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

/** Every piece of text in the app. color takes a palette key or a raw colour. */
export function T({ v = "body", color = "text", num, center, style, ...rest }: Props) {
  const c = useTheme();
  const col = (c as Record<string, unknown>)[color];
  return (
    <Text
      {...rest}
      style={[
        variants[v],
        { color: typeof col === "string" ? col : color },
        num && { fontVariant: ["tabular-nums"] },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}
