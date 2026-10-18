import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { dayMonth, stamp } from "@/lib/time";
import { T } from "@/ui/text";
import { useTheme } from "@/ui/theme";

/** Step graph of the waitlist number over time (0 = seated / available), one point per change. */
export function WlGraph({ points }: { points: { t: number; wl: number }[] }) {
  const c = useTheme();
  if (!points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const W = 320;
  const H = 96;
  const pad = 6;
  const maxWl = Math.max(...points.map((p) => p.wl), 1);
  const t1 = Math.max(last.t, first.t + 1);
  const x = (t: number) => pad + ((t - first.t) / (t1 - first.t)) * (W - 2 * pad);
  const y = (wl: number) => pad + (1 - wl / maxWl) * (H - 2 * pad);
  // Status holds until the next change.
  const d = points.map((p, i) => (i === 0 ? `M${x(p.t)},${y(p.wl)}` : `H${x(p.t)}V${y(p.wl)}`)).join("");
  const label = (wl: number) => (wl ? `WL ${wl}` : "seated");
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="caption" color="muted">
          Waitlist movement
        </T>
        <T v="caption" color="muted" num>
          {label(first.wl)} to {label(last.wl)}
        </T>
      </View>
      {points.length > 1 ? (
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={`Waitlist moved from ${first.wl} to ${last.wl}`}>
          <Line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke={c.border} strokeDasharray="3 3" />
          <Path d={d} fill="none" stroke={c.primary} strokeWidth={2} strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={i} cx={x(p.t)} cy={y(p.wl)} r={2.5} fill={c.primary} />
          ))}
        </Svg>
      ) : (
        <T v="caption" color="faint">
          No change since tracking started.
        </T>
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="caption" color="faint">
          {dayMonth(first.t)}
        </T>
        <T v="caption" color="faint">
          {points.length} change{points.length === 1 ? "" : "s"}, last {stamp(last.t)}
        </T>
      </View>
    </View>
  );
}
