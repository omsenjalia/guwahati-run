/** App icon drawn in code: a cobalt "GR" on charcoal. Rendered by next/og. */
export function AppIcon({ px }: { px: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#16191f",
        color: "#7aa7ff",
        fontSize: px * 0.36,
        fontWeight: 700,
        letterSpacing: -px * 0.02,
      }}
    >
      GR
    </div>
  );
}
