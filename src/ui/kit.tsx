import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { activeLang, tr } from "@/i18n";
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

/** Labelled text box. mono = code editor look (developer options). */
export function Input({ label, mono, style, ...rest }: TextInputProps & { label?: string; mono?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <T v="label" color="muted">
          {label}
        </T>
      )}
      <TextInput
        placeholderTextColor={c.faint}
        accessibilityLabel={label}
        {...rest}
        placeholder={rest.placeholder ? tr(rest.placeholder, activeLang()) : undefined}
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          rest.multiline && styles.multiline,
          mono && styles.mono,
          style,
        ]}
      />
    </View>
  );
}

/** One-of-several choice as a row of pills. */
export function Chips<V extends string>({ options, value, onChange }: { options: readonly { value: V; label: string }[]; value: V | null; onChange: (v: V) => void }) {
  const c = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.chip, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}
          >
            <T v="label" color={on ? c.onPrimary : "text"}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tick box row. */
export function Check({ label, sub, on, onPress }: { label: string; sub?: string; on: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => [styles.check, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.box, { borderColor: on ? c.good : c.faint, backgroundColor: on ? c.good : "transparent" }]}>
        {on && <MaterialCommunityIcons name="check" size={16} color={c.surface} />}
      </View>
      <View style={{ flex: 1 }}>
        <T v="body" color={on ? "muted" : "text"} style={on && { textDecorationLine: "line-through" }}>
          {label}
        </T>
        {!!sub && (
          <T v="caption" color="faint">
            {sub}
          </T>
        )}
      </View>
    </Pressable>
  );
}

/** Tappable list row: icon, label, optional detail, chevron. */
export function LinkRow({ icon, label, sub, onPress, tone }: { icon: IconName; label: string; sub?: string; onPress: () => void; tone?: Tone }) {
  const c = useTheme();
  const { fg, bg } = toneColors(c, tone ?? "primary");
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.infoIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label" style={{ fontSize: 15 }}>
          {label}
        </T>
        {!!sub && (
          <T v="caption" color="muted">
            {sub}
          </T>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={c.faint} />
    </Pressable>
  );
}

/** Yes/no question; resolves true on yes (window.confirm on the web build). */
export function confirm(title: string, message: string, yes = "OK"): Promise<boolean> {
  const lang = activeLang();
  const t = tr(title, lang);
  const m = tr(message, lang);
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${t}\n\n${m}`));
  return new Promise((resolve) =>
    Alert.alert(t, m, [
      { text: tr("Cancel", lang), style: "cancel", onPress: () => resolve(false) },
      { text: tr(yes, lang), style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 16 },
  multiline: { paddingVertical: 12, minHeight: 110, textAlignVertical: "top" },
  mono: { fontFamily: Platform.OS === "android" ? "monospace" : "Menlo, Consolas, monospace", fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
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
