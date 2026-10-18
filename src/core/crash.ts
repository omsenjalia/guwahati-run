import { Alert } from "react-native";

/**
 * In a release build a fatal JavaScript error closes the app with no message.
 * Show the error instead, so a crash on a phone can be read and reported.
 * Imported first by the root layout so it covers everything loaded after it.
 */
if (!__DEV__) {
  const next = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (!isFatal) return next(error, isFatal);
    Alert.alert("Guwahati Run hit an error", describeError(error));
  });
}

/** "TypeError: x is undefined" plus the first lines of the stack. */
export function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const stack = (error.stack ?? "").split("\n").slice(1, 6).join("\n");
  return `${error.name}: ${error.message}${stack ? `\n\n${stack}` : ""}`;
}
