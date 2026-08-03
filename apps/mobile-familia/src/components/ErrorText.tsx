import { Text } from "react-native";
import { useGerasTheme } from "@geras/ui";

export function ErrorText({ children }: { children?: string | null }) {
  const theme = useGerasTheme();
  if (!children) return null;
  return <Text style={{ fontSize: 13, color: theme.error }}>{children}</Text>;
}
