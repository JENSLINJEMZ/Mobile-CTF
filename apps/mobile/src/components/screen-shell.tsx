import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function ScreenShell({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} accessibilityRole="header">
        <View
          style={[
            styles.headerBar,
            { backgroundColor: theme.tabBar, borderBottomColor: theme.separator },
          ]}
        >
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.header}>
            {title}
          </ThemedText>
        </View>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset,
  },
  content: {
    flex: 1,
    width: "100%",
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  headerBar: {
    width: "100%",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    marginTop: 0,
  },
});