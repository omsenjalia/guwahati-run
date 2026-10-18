import { useColorScheme } from "react-native";

/** Night-train palette: ink blue, warm paper, saffron for Indian Railways. */
const light = {
  bg: "#F4F1EA",
  surface: "#FFFFFF",
  surface2: "#F0ECE3",
  border: "rgba(14,23,38,0.08)",
  text: "#0E1726",
  muted: "#5B6577",
  faint: "#8A93A3",
  primary: "#2446C7",
  primarySoft: "#E6EBFB",
  onPrimary: "#FFFFFF",
  accent: "#E07B1F",
  accentSoft: "#FCEBD9",
  good: "#12855B",
  goodSoft: "#E1F3EA",
  warn: "#A86A10",
  warnSoft: "#FBEFD6",
  bad: "#C2362F",
  badSoft: "#FBE5E2",
  hero: ["#0E1A3A", "#263C8F"] as readonly [string, string],
  tabBar: "rgba(255,255,255,0.94)",
  shadow: "#0E1726",
};

const dark: typeof light = {
  bg: "#0A0F1C",
  surface: "#121A2B",
  surface2: "#1A2438",
  border: "rgba(255,255,255,0.08)",
  text: "#EEF1F7",
  muted: "#9AA4B6",
  faint: "#6C778B",
  primary: "#8AA4FF",
  primarySoft: "rgba(138,164,255,0.14)",
  onPrimary: "#0A0F1C",
  accent: "#F3A04B",
  accentSoft: "rgba(243,160,75,0.14)",
  good: "#3DD69B",
  goodSoft: "rgba(61,214,155,0.13)",
  warn: "#F2C14E",
  warnSoft: "rgba(242,193,78,0.13)",
  bad: "#FF7A70",
  badSoft: "rgba(255,122,112,0.13)",
  hero: ["#141F4A", "#2E3388"] as const,
  tabBar: "rgba(22,31,50,0.96)",
  shadow: "#000000",
};

export type Palette = typeof light;
export type Tone = "good" | "warn" | "bad" | "primary" | "accent" | "neutral";

export function useTheme() {
  return useColorScheme() === "dark" ? dark : light;
}

/** Foreground and background for a status tone. */
export function toneColors(c: Palette, tone: Tone) {
  switch (tone) {
    case "good":
      return { fg: c.good, bg: c.goodSoft };
    case "warn":
      return { fg: c.warn, bg: c.warnSoft };
    case "bad":
      return { fg: c.bad, bg: c.badSoft };
    case "primary":
      return { fg: c.primary, bg: c.primarySoft };
    case "accent":
      return { fg: c.accent, bg: c.accentSoft };
    default:
      return { fg: c.muted, bg: c.surface2 };
  }
}

export const font = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  heavy: "Manrope_800ExtraBold",
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
/** Space under scroll content so the floating tab bar never covers it. */
export const TAB_BAR_SPACE = 112;
