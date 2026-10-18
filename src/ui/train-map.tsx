import { useEffect, useRef, useState, type ComponentRef } from "react";
import { useColorScheme } from "react-native";
import { WebView } from "react-native-webview";
import { trainMapHtml, type MapStation } from "./train-map-html";

/** The page is built once (render with a new key for another train); later changes are sent in without reloading. */
export type TrainMapProps = { stations: MapStation[]; from: number; to: number; offset: number; caption: string; moving: boolean };

/** The live 3D train map (a MapLibre page in a WebView). Fills its parent. */
export function TrainMap(props: TrainMapProps) {
  const dark = useColorScheme() === "dark";
  const ref = useRef<ComponentRef<typeof WebView>>(null);
  const { stations, caption, moving, from, to, offset } = props;
  // Built once; give the component a new key for a new train.
  const [html] = useState(() => trainMapHtml({ stations, caption, moving, from, to, offset, dark }));
  useEffect(() => {
    ref.current?.injectJavaScript(`window.update&&window.update(${JSON.stringify({ stations, caption, moving })});true;`);
  }, [stations, caption, moving]);
  return <WebView ref={ref} originWhitelist={["*"]} source={{ html, baseUrl: "https://guwahati-run.vercel.app" }} style={{ flex: 1, backgroundColor: "transparent" }} />;
}
