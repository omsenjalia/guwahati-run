import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/core/auth";
import {
  clearChat,
  fetchChatStatus,
  loadChat,
  metaLabel,
  parseMarkdown,
  retryChat,
  sendChat,
  suggestionsFor,
  useChat,
  type Block,
  type ChatMessage,
  type ChatStatus,
} from "@/features/chat";
import { useLang } from "@/i18n";
import { IconButton, confirm } from "@/ui/kit";
import { T } from "@/ui/text";
import { TAB_BAR_SPACE, font, radius, useTheme, type Palette } from "@/ui/theme";

/**
 * The assistant tab (same shape as WeatherGPT's chat): an empty state with
 * suggested questions, then a conversation over /api/chat. The server holds
 * the Groq key and answers from the collected trip data (src/features/chat.ts).
 */
export default function Chat() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const role = session?.role ?? "parent";
  const { messages, sending, error } = useChat();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    void loadChat();
    void fetchChatStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // A question handed over from another screen as ?q=… is sent once (WeatherGPT does the same).
  const { q } = useLocalSearchParams<{ q?: string }>();
  useEffect(() => {
    if (typeof q !== "string" || !q.trim()) return;
    void sendChat(q);
    router.setParams({ q: undefined });
  }, [q]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    void sendChat(text);
  };

  const dockBottom = keyboardUp ? 8 : insets.bottom + TAB_BAR_SPACE - 28;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top + 14 }]}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <T v="title">Chat</T>
            <T v="label" color="muted" style={{ marginTop: 2 }}>
              Ask about the trip
            </T>
          </View>
          {messages.length > 0 && (
            <IconButton
              icon="square-edit-outline"
              label="New conversation"
              onPress={async () => {
                if (await confirm("Start a new conversation?", "This clears the chat on this phone.", "Clear")) clearChat();
              }}
            />
          )}
        </View>

        {status && !status.configured && (
          <View style={[styles.note, { backgroundColor: c.warnSoft }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={c.warn} />
            <T v="caption" color={c.warn} style={{ flex: 1 }}>
              AI is off on the server, so answers come straight from trip data. Add a Groq key to switch it on (SETUP.md).
            </T>
          </View>
        )}

        {messages.length === 0 && !sending ? (
          <EmptyChat role={role} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageRow message={item} />}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={sending ? <TypingRow /> : undefined}
          />
        )}

        <View style={{ paddingBottom: dockBottom, gap: 8 }}>
          {error && (
            <View style={[styles.note, { backgroundColor: c.badSoft }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={c.bad} />
              <T v="caption" color={c.bad} style={{ flex: 1 }}>
                {error}
              </T>
              <Pressable accessibilityRole="button" onPress={() => void retryChat()} hitSlop={8}>
                <T v="label" color={c.bad}>
                  Try again
                </T>
              </Pressable>
            </View>
          )}
          <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about trains, seats, weather…"
              placeholderTextColor={c.faint}
              selectionColor={c.primary}
              multiline
              numberOfLines={1}
              maxLength={2000}
              accessibilityLabel="Ask about trains, seats, weather…"
              onSubmitEditing={submit}
              blurOnSubmit={false}
              submitBehavior="submit"
              returnKeyType="send"
              style={[styles.input, { color: c.text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={!draft.trim() || sending}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
                submit();
              }}
              style={[styles.sendBtn, { backgroundColor: draft.trim() && !sending ? c.primary : c.surface2 }]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={c.faint} />
              ) : (
                <MaterialCommunityIcons name="arrow-up" size={19} color={draft.trim() ? c.onPrimary : c.faint} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function EmptyChat({ role }: { role: "team" | "parent" }) {
  const c = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primary }]}>
        <MaterialCommunityIcons name="robot-happy-outline" size={30} color={c.onPrimary} />
      </View>
      <T v="heading" center>
        What do you want to know?
      </T>
      <T v="body" color="muted" center style={{ maxWidth: 340 }}>
        Answers come from the live data the app already collects: trains, tickets, weather, IRCTC food prices and money.
      </T>
      <View style={styles.suggestions}>
        {suggestionsFor(role).map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            accessibilityLabel={prompt}
            onPress={() => void sendChat(prompt)}
            style={({ pressed }) => [styles.suggestion, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <T v="body" style={{ flex: 1 }}>
              {prompt}
            </T>
            <MaterialCommunityIcons name="arrow-top-right" size={17} color={c.faint} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TypingRow() {
  const c = useTheme();
  return (
    <View style={styles.assistantRow} accessibilityLiveRegion="polite">
      <AssistantAvatar />
      <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.surface, borderColor: c.border, flexDirection: "row", gap: 8, alignItems: "center" }]}>
        <ActivityIndicator size="small" color={c.primary} />
        <T v="label" color="muted">
          Thinking
        </T>
      </View>
    </View>
  );
}

function AssistantAvatar() {
  const c = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: c.primary }]}>
      <MaterialCommunityIcons name="robot-happy-outline" size={16} color={c.onPrimary} />
    </View>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const c = useTheme();
  if (message.role === "user") {
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, { backgroundColor: c.primary, borderBottomRightRadius: 6 }]}>
          <PlainBody color={c.onPrimary}>{message.content}</PlainBody>
        </View>
      </View>
    );
  }
  const chip = metaLabel(message.meta);
  return (
    <View style={styles.assistantRow}>
      <AssistantAvatar />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.surface, borderColor: c.border }]}>
          <RichBody blocks={parseMarkdown(message.content)} c={c} />
        </View>
        {chip && (
          <T v="caption" color="faint">
            {chip}
          </T>
        )}
      </View>
    </View>
  );
}

/** The user's own words, untranslated. */
function PlainBody({ children, color }: { children: string; color: string }) {
  const { lang } = useLang();
  return (
    <Text selectable style={[styles.bodyText, { color }, lang !== "en" && { fontFamily: undefined }]}>
      {children}
    </Text>
  );
}

/**
 * An assistant reply: already in the chosen language (the server is told
 * which), so it is rendered with plain Text instead of the translating T.
 */
function RichBody({ blocks, c }: { blocks: Block[]; c: Palette }) {
  const { lang } = useLang();
  const base = [styles.bodyText, { color: c.text }, lang !== "en" && { fontFamily: undefined }];
  return (
    <View style={{ gap: 6 }}>
      {blocks.map((block, i) => (
        <View key={i} style={block.type === "li" ? styles.liRow : undefined}>
          {block.type === "li" && (
            <Text style={[base, { color: c.accent, fontFamily: font.bold }]}>{block.num ? `${block.num}.` : "•"}</Text>
          )}
          <Text selectable style={[base, block.type === "li" && { flex: 1 }, block.type === "h" && styles.headText]}>
            {block.spans.map((span, j) => (
              <Text
                key={j}
                onPress={span.href ? () => void Linking.openURL(span.href!) : undefined}
                style={[
                  span.bold && { fontFamily: font.bold },
                  span.code && styles.codeText,
                  span.href && { color: c.primary, textDecorationLine: "underline" as const },
                ]}
              >
                {span.text}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  list: { paddingVertical: 6, paddingBottom: 18, gap: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, paddingBottom: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  suggestions: { alignSelf: "stretch", gap: 8, marginTop: 18 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 7,
  },
  input: { flex: 1, minHeight: 38, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  userRow: { flexDirection: "row", justifyContent: "flex-end", paddingLeft: 56 },
  assistantRow: { flexDirection: "row", gap: 9, paddingRight: 28 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 3 },
  bubble: { borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10 },
  assistantBubble: { borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  bodyText: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  headText: { fontFamily: font.bold, fontSize: 16 },
  codeText: { fontFamily: Platform.OS === "android" ? "monospace" : "Menlo, Consolas, monospace", fontSize: 13 },
  liRow: { flexDirection: "row", gap: 8 },
});
