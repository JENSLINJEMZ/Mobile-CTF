import { useState, useEffect, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { LucideIcon } from "@/components/lucide-icon";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

function split(diffMs: number) {
  const total = Math.max(0, Math.floor(diffMs / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    mins: Math.floor((total % 3600) / 60),
    secs: total % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Countdown({
  target,
  mode,
}: {
  target: string;
  mode: "starts" | "ends";
}) {
  const theme = useTheme();
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetMs - now);
  const { days, hours, mins, secs } = split(diff);

  return (
    <View
      style={[
        styles.block,
        { borderColor: "rgba(167,139,250,.28)" },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headTitle}>
          <LucideIcon name="clock" size={14} color={theme.accent} />
          <ThemedText style={[styles.headText, { color: theme.accent }]}>
            {mode === "ends" ? "Ends in" : "Starts in"}
          </ThemedText>
        </View>
        <ThemedText style={styles.headSub}>
          {mode === "ends" ? "Live now" : "Save your seat"}
        </ThemedText>
      </View>
      <LinearGradient
        colors={[
          "rgba(139,92,246,.08)",
          "transparent",
          "transparent",
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.blockGlow}
        pointerEvents="none"
      />
      <View style={styles.grid}>
        {[
          { value: pad(days), label: "DAYS" },
          { value: pad(hours), label: "HOURS" },
          { value: pad(mins), label: "MINS" },
          { value: pad(secs), label: "SECS" },
        ].map((unit) => (
          <View
            key={unit.label}
            style={[styles.unit, { backgroundColor: "rgba(5,4,12,.6)", borderColor: "#201a33" }]}
          >
            <ThemedText style={styles.num}>{unit.value}</ThemedText>
            <ThemedText style={styles.lbl}>{unit.label}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  blockGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two + Spacing.one,
  },
  headTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  headText: {
    fontSize: 12,
    fontWeight: "800",
  },
  headSub: {
    fontSize: 10,
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  unit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  num: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: Spacing.one,
    textShadowColor: "rgba(139,92,246,.6)",
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  lbl: {
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
});