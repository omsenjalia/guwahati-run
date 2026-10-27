import { View } from "react-native";
import { LANGS, useLang } from ".";
import { Chips } from "@/ui/kit";
import { T } from "@/ui/text";

/** English / हिन्दी / ગુજરાતી. Used on onboarding and in settings. */
export function LangPicker({ label = true }: { label?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <View style={{ gap: 8, alignSelf: "stretch" }}>
      {label && (
        <T v="label" color="muted">
          Language
        </T>
      )}
      <Chips options={LANGS.map((l) => ({ value: l.value, label: l.native }))} value={lang} onChange={setLang} />
    </View>
  );
}
