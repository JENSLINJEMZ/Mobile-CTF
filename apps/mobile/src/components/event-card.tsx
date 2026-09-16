import type { EventSummaryDto } from "@ctf/shared";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { LucideIcon, type LucideName } from "@/components/lucide-icon";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type BadgeTone = {
  label: string;
  bg: string;
  fg: string;
  border?: string;
};

function badgeFor(event: EventSummaryDto, theme: ReturnType<typeof useTheme>): BadgeTone | null {
  switch (event.status) {
    case "RUNNING":
      return { label: "Live Now", bg: theme.danger, fg: "#fff" };
    case "SCHEDULED":
      return { label: "Coming Soon", bg: "rgba(34,211,238,0.18)", fg: "#cffafe", border: "rgba(34,211,238,0.4)" };
    case "ENDED":
      return { label: "Completed", bg: "rgba(255,255,255,0.06)", fg: theme.textSecondary, border: theme.borderStrong };
    default:
      return { label: "Draft", bg: theme.backgroundSelected, fg: theme.textSecondary };
  }
}

function dateBlock(event: EventSummaryDto): { m: string; d: string } {
  const start = new Date(event.startsAt);
  if (event.status === "RUNNING") {
    return { m: "LIVE", d: "NOW" };
  }
  return {
    m: start.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    d: String(start.getDate()).padStart(2, "0"),
  };
}

function artFor(event: EventSummaryDto): { icon: LucideName; color: string } {
  const slug = event.slug;
  if (slug.includes("cyferra")) return { icon: "trophy", color: "#a78bfa" };
  if (slug.includes("web") || slug.includes("sprint")) return { icon: "globe", color: "#60a5fa" };
  if (slug.includes("mobile") || slug.includes("phone")) return { icon: "terminal", color: "#f472b6" };
  if (slug.includes("reverse") || slug.includes("re-")) return { icon: "cube", color: "#22d3ee" };
  if (slug.includes("hack") || slug.includes("winter")) return { icon: "flame", color: "#a78bfa" };
  return { icon: "calendar", color: "#a78bfa" };
}

export function EventCard({ event, index = 0 }: { event: EventSummaryDto; index?: number }) {
  const theme = useTheme();
  const badge = badgeFor(event, theme);
  const date = dateBlock(event);
  const art = artFor(event);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index, 8) * 70;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [index, progress]);

  const opacity = progress;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open event ${event.title}`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
        <View
          style={[
            styles.dateBlock,
            event.status === "ENDED" && styles.dateBlockPast,
          ]}
        >
          <ThemedText style={[styles.dateMonth, { color: theme.accent }]}>
            {date.m}
          </ThemedText>
          <ThemedText style={styles.dateDay}>{date.d}</ThemedText>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {event.title}
            </ThemedText>
            {badge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: badge.bg,
                    borderColor: badge.border,
                  },
                ]}
              >
                <ThemedText style={[styles.badgeText, { color: badge.fg }]}>
                  {badge.label}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={styles.desc} numberOfLines={2}>
            {event.description
              .replace(/^#[^\n]*\n?/, "")
              .replace(/[#*`>]/g, "")
              .trim() || "No description yet."}
          </ThemedText>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <LucideIcon name="users" size={12} color={theme.textSecondary} />
              <ThemedText style={styles.metaText}>
                {event.participantCount} participant
                {event.participantCount === 1 ? "" : "s"}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <LucideIcon name="globe" size={12} color={theme.textSecondary} />
              <ThemedText style={styles.metaText}>Online</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.art}>
          <LucideIcon name={art.icon} size={38} color={art.color} />
        </View>

        <View style={styles.chevronWrap}>
          <LucideIcon name="chevron" size={16} color={theme.textSecondary} />
        </View>
      </Pressable>
      </Animated.View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  dateBlock: {
    flex: 0,
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.28)",
  },
  dateBlockPast: {
    opacity: 0.55,
  },
  dateMonth: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: Spacing.half,
  },
  dateDay: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 17,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 17,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#b0abc9",
    marginBottom: Spacing.one + Spacing.half,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one + Spacing.half,
  },
  metaText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#b0abc9",
  },
  art: {
    alignItems: "center",
  },
  chevronWrap: {
    position: "absolute",
    bottom: Spacing.three,
    right: Spacing.three,
  },
});