import { cacheGet, cacheSet } from "./storage";
import { createStore, useStore } from "./store";

/** Om's per-phone developer switches (not shared with other phones). */
const KEY = "dev.allTrains";
const allTrains = createStore(false);
void cacheGet<boolean>(KEY).then((v) => v && allTrains.set(true));

export const useAllTrains = () => useStore(allTrains);
export function setAllTrains(on: boolean) {
  allTrains.set(on);
  void cacheSet(KEY, on);
}
