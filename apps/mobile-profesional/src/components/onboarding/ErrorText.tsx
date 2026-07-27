import { Text } from "react-native";

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text className="text-sm text-red-600">{children}</Text>;
}
