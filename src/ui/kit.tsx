import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { T } from "./text";
import { font, radius, toneColors, useTheme, type Tone } from "./theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? c.text} />;
}

const tap = () => {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
};

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
  const c = useTheme();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, padded && styles.padded, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Small rounded status label. */
export function Pill({ label, tone = "neutral", icon, solid }: { label: string; tone?: Tone; icon?: IconName; solid?: boolean }) {
  const c = useTheme();
  const { fg, bg } = toneColors(c, tone);
  return (
    <View style={[styles.pill, { backgroundColor: solid ? fg : bg }]}>
      {icon && <MaterialCommunityIcons name={icon} size={13} color={solid ? c.surface : fg} />}
      <T v="label" color={solid ? c.surface : fg} style={{ fontSize: 12 }}>
        {label}
      </T>
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = "primary",
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg = { primary: c.primary, secondary: c.surface2, ghost: "transparent", danger: c.badSoft }[kind];
  const fg = { primary: c.onPrimary, secondary: c.text, ghost: c.primary, danger: c.bad }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && <MaterialCommunityIcons name={icon} size={19} color={fg} />}
      <T v="label" color={fg} style={{ fontSize: 15, fontFamily: font.bold }}>
        {label}
      </T>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone }: { icon: IconName; onPress: () => void; label: string; tone?: Tone }) {
  const c = useTheme();
  const { fg, bg } = toneColors(c, tone ?? "neutral");
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: tone ? bg : c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={tone ? fg : c.text} />
    </Pressable>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.sectionHead}>
        <T v="overline" color="faint">
          {title}
        </T>
        {action}
      </View>
      {children}
    </View>
  );
}

/** Icon + text row used inside cards. */
export function InfoRow({ icon, label, value, tone }: { icon: IconName; label: string; value?: ReactNode; tone?: Tone }) {
  const c = useTheme();
  const { fg, bg } = toneColors(c, tone ?? "neutral");
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={17} color={tone ? fg : c.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="caption" color="muted">
          {label}
        </T>
        {typeof value === "string" ? <T v="label">{value}</T> : value}
      </View>
    </View>
  );
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 4 }} />;
}

/** Initials in a circle, coloured per person. */
const AVATAR = ["#2446C7", "#E07B1F", "#12855B", "#9B3FBF"];
export const avatarColor = (index: number) => AVATAR[index % 4];

export function Avatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(index), alignItems: "center", justifyContent: "center" }}>
      <T v="label" color="#FFFFFF" style={{ fontSize: size * 0.36, lineHeight: size * 0.5, fontFamily: font.heavy }}>
        {initials}
      </T>
    </View>
  );
}

export function Empty({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 16 }}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surface2 }]}>
        <MaterialCommunityIcons name={icon} size={26} color={c.muted} />
      </View>
      <T v="heading" center>
        {title}
      </T>
      {body && (
        <T v="body" color="muted" center>
          {body}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: 16 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 50, paddingHorizontal: 18, borderRadius: radius.md },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});
