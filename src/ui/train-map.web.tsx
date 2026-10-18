import { useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { trainMapHtml } from "./train-map-html";
import type { TrainMapProps } from "./train-map";

/** Web build: the same map page in an iframe; updates go in by postMessage. */
export function TrainMap(props: TrainMapProps) {
  const dark = useColorScheme() === "dark";
  const ref = useRef<HTMLIFrameElement>(null);
  const { stations, caption, moving, from, to, offset } = props;
  // Built once; give the component a new key for a new train.
  const [html] = useState(() => trainMapHtml({ stations, caption, moving, from, to, offset, dark }));
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ stations, caption, moving }, "*");
  }, [stations, caption, moving]);
  return <iframe ref={ref} srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} title="Live train map" />;
}
