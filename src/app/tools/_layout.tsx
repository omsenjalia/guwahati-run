import { Stack } from "expo-router/stack";
import { useTheme } from "@/ui/theme";

/** Everything opened from the More tab (and Settings), stacked over the tabs. */
export default function ToolsLayout() {
  const c = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
