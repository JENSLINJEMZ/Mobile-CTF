import type { EventSummaryDto } from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { GradientText } from "@/components/gradient-text";
import { LucideIcon } from "@/components/lucide-icon";
import { ThemedText } from "@/components/themed-text";
import { Fonts, Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

const AUTO_ADVANCE_MS = 5500;

const TITLE_COLORS = ["#ffffff", "#e9e4ff", "#a78bfa", "#7c3aed"];

const DECOS = [
  "SAME\nMINDS\nBIGGER\nIMPACT",
  "HACK\nLEARN\nCONNECT",
  "TINY\nDEVICE\nBIG\nSECRETS",
];

function slideGradient(index: number) {
  const gradients = [
    ["#2a1a52", "#1a0f30", "#0d0818"],
    ["#1b1040", "#1a0f30", "#0d0818"],
    ["#2a1450", "#1a0f30", "#0d0818"],
  ];
  return gradients[index % gradients.length];
}

function statusLabel(event: EventSummaryDto): string {
  if (event.status === "RUNNING") return "LIVE NOW";
  if (event.status === "ENDED") return "COMPLETED";
  return "UPCOMING";
}

export function FeaturedCarousel({
  events,
  onEventPress,
}: {
  events: EventSummaryDto[];
  onEventPress?: (event: EventSummaryDto) => void;
}) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(0);
  const [paused, setPaused] = useState(false);

  const stopAuto = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const slideWidth = Math.min(width - Spacing.four * 2, 800);

  const goTo = useCallback(
    (index: number) => {
      if (!scrollRef.current) return;
      const count = events.length;
      if (count === 0) return;
      const target = (index + count) % count;
      scrollRef.current.scrollTo({
        x: target * slideWidth,
        animated: !reduceMotion,
      });
      activeRef.current = target;
      setActive(target);
    },
    [events.length, reduceMotion, slideWidth],
  );

  useEffect(() => {
    if (events.length <= 1) return;
    const start = () => {
      stopAuto();
      timerRef.current = setInterval(() => {
        if (!paused) goTo(activeRef.current + 1);
      }, AUTO_ADVANCE_MS);
    };
    start();
    return () => stopAuto();
  }, [events.length, goTo, paused, stopAuto]);

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (events.length === 0) return;
      const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    },
    [events.length, slideWidth],
  );

  if (events.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.viewport}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            setPaused(true);
            stopAuto();
          }}
          onScrollEndDrag={() => setPaused(false)}
          contentContainerStyle={{ width: events.length * slideWidth }}
        >
          {events.map((event, index) => {
            const colors = slideGradient(index);
            const status = statusLabel(event);
            const date = new Date(event.startsAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const deco = DECOS[index % DECOS.length];
            return (
              <Pressable
                key={event.id}
                onPress={() => onEventPress?.(event)}
                style={({ pressed }) => [
                  styles.slide,
                  {
                    width: slideWidth,
                    backgroundColor: colors[2],
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open event ${event.title}`}
              >
                <View
                  style={[
                    styles.slideBg,
                    {
                      backgroundColor: colors[0],
                      borderBottomColor: colors[1],
                    },
                  ]}
                />
                <LinearGradient
                  colors={["rgba(20,8,42,.94)", "rgba(20,8,42,.35)", "rgba(20,8,42,.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scrim}
                />
                <LinearGradient
                  colors={["rgba(20,8,42,.25)", "transparent", "rgba(20,8,42,.35)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.scrim}
                />
                <View style={styles.slideContent}>
                  <GradientText
                    text={event.title}
                    width={slideWidth * 0.78}
                    colors={TITLE_COLORS}
                    style={styles.slideTitle}
                  />
                  <View style={styles.slideSub}>
                    <ThemedText style={[styles.slideSubText, status === "LIVE NOW" && { color: "#fca5a5" }]}>
                      {status}
                    </ThemedText>
                    <View style={styles.slideSubDot} />
                    <ThemedText style={styles.slideSubText}>{date}</ThemedText>
                  </View>
                  <View style={styles.slideMeta}>
                    <View style={styles.slideMetaItem}>
                      <LucideIcon name="calendar" size={13} color="rgba(196,181,253,.9)" />
                      <ThemedText style={styles.slideMetaText}>
                        {new Date(event.startsAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </ThemedText>
                    </View>
                    <View style={styles.slideMetaItem}>
                      <LucideIcon name="bulb" size={13} color="rgba(196,181,253,.9)" />
                      <ThemedText style={styles.slideMetaText}>Online · Global</ThemedText>
                    </View>
                  </View>
                  <LinearGradient
                    colors={["#8b5cf6", "#6d28d9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.slideCta}
                  >
                    <ThemedText style={styles.slideCtaText}>View Details</ThemedText>
                    <LucideIcon name="arrow" size={15} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.slideDeco} pointerEvents="none">
                  <ThemedText style={styles.slideDecoText}>{deco}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {events.length > 1 ? (
        <View style={styles.dots}>
          {events.map((event, index) => (
            <Pressable
              key={event.id}
              onPress={() => goTo(index)}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${index + 1}`}
              style={[
                styles.dot,
                active === index && styles.dotActive,
              ]}
            >
              {active === index ? (
                <LinearGradient
                  colors={["#8b5cf6", "#a78bfa"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dotFill}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: Spacing.three,
  },
  viewport: {
    borderRadius: 18,
    overflow: "hidden",
  },
  slide: {
    minHeight: 230,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  slideBg: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderBottomWidth: 1,
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  slideContent: {
    position: "relative",
    padding: 20,
    paddingTop: 18,
    maxWidth: "82%",
    gap: 0,
  },
  slideTitle: {
    fontFamily: Fonts.serif,
    fontStyle: "italic",
    fontWeight: "900",
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -1.4,
    marginBottom: 10,
  },
  slideSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },
  slideSubText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.4,
    color: "rgba(233, 227, 255, 0.85)",
  },
  slideSubDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(233, 227, 255, 0.5)",
  },
  slideMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  slideMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  slideMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(233, 227, 255, 0.92)",
  },
  slideCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: 12,
    elevation: 3,
  },
  slideCtaText: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "700",
  },
  slideDeco: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  slideDecoText: {
    fontFamily: Fonts.serif,
    fontStyle: "italic",
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "right",
    color: "rgba(233, 227, 255, 0.92)",
    transform: [{ rotate: "-3deg" }],
    textShadowColor: "rgba(0,0,0,.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },
  dotFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: {
    opacity: 0.9,
  },
});