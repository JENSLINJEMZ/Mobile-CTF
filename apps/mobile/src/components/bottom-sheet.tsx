import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

/**
 * Simple bottom sheet: modal with a scrim + a slide-up panel carrying a
 * title and content. Dismiss on scrim tap, on swipe-down, or via
 * `onRequestClose` (Android back). No drag handle math — slides are
 * spring-based and honor `reduceMotion`.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (visible) {
      mounted.current = true;
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 0,
      }).start();
    } else if (mounted.current) {
      Animated.timing(anim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 180,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim, reduceMotion]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
          style={({ pressed }) => [
            styles.scrim,
            { backgroundColor: theme.scrim },
            pressed && styles.scrimPressed,
          ]}
          onPress={onClose}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[styles.handle, { backgroundColor: theme.borderStrong }]}
          />
          {title ? (
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrimPressed: {
    opacity: 0.9,
  },
  panel: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.three,
  },
  title: {
    marginBottom: Spacing.three,
  },
});