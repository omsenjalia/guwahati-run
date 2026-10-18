import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** Hands a text file (CSV, HTML...) to the phone's share sheet; downloads it on the web build. */
export async function shareTextFile(name: string, text: string, mimeType: string) {
  if (Platform.OS === "web") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mimeType }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const f = new File(Paths.cache, name);
  f.create({ overwrite: true });
  f.write(text);
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: name });
}
