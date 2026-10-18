import { createElement } from "react";
import { useColorScheme, View } from "react-native";
import { mapHtml, type MapPoint } from "./map-html";
import { radius, useTheme } from "./theme";

/** Web build: the same Leaflet page in an iframe (react-native-webview has no web support). */
export function MapView({ points, height = 300 }: { points: MapPoint[]; height?: number }) {
  const c = useTheme();
  const dark = useColorScheme() === "dark";
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surface2 }}>
      {createElement("iframe", { srcDoc: mapHtml(points, dark), style: { border: 0, width: "100%", height: "100%" }, title: "Map" })}
    </View>
  );
}
