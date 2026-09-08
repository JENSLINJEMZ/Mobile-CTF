import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassBackground } from "@/components/glass-background";
import { ThemedText } from "@/components/themed-text";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

export function ScreenShell({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <GlassBackground />
      <SafeAreaView style={styles.safeArea} accessibilityRole="header">
        <ThemedText type="title" accessibilityRole="header" style={styles.header}>
          {title}
        </ThemedText>
        {children}
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
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginTop: Spacing.two,
  },
});