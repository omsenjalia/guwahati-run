import { useColorScheme, View } from "react-native";
import { WebView } from "react-native-webview";
import { mapHtml, type MapPoint } from "./map-html";
import { radius, useTheme } from "./theme";

export function MapView({ points, height = 300 }: { points: MapPoint[]; height?: number }) {
  const c = useTheme();
  const dark = useColorScheme() === "dark";
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surface2 }}>
      <WebView originWhitelist={["*"]} source={{ html: mapHtml(points, dark), baseUrl: "https://guwahati-run.vercel.app" }} style={{ backgroundColor: "transparent" }} />
    </View>
  );
}
