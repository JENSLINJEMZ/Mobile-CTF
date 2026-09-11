import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

type ToastTone = "default" | "success" | "error";

type ToastMessage = {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
};

type ToastApi = {
  show: (input: { title: string; body?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  default: "information-circle",
  success: "checkmark-circle",
  error: "alert-circle",
};

const TONE_COLOR: Record<ToastTone, keyof ReturnType<typeof useTheme>> = {
  default: "textSecondary",
  success: "success",
  error: "danger",
} as const;

/** Ephemeral, top-stacked feedback that appears under the header bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: reduceMotion ? 0 : 160,
      useNativeDriver: true,
    }).start(() => setMessage(null));
  }, [opacity, reduceMotion]);

  const show = useCallback<ToastApi["show"]>(
    ({ title, body, tone = "default" }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage((prev) => ({ id: (prev?.id ?? 0) + 1, title, body, tone }));
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduceMotion ? 0 : 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 0,
        }),
      ]).start();
      timerRef.current = setTimeout(() => dismiss(), 3200);
    },
    [dismiss, opacity, reduceMotion, translateY],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={[
            styles.wrapper,
            { top: insets.top + Spacing.three },
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: theme.toast.bg,
                borderColor: theme.toast.border,
              },
            ]}
          >
            <Ionicons
              name={ICON[message.tone]}
              size={20}
              color={theme[TONE_COLOR[message.tone]] as string}
            />
            <View style={styles.copy}>
              <ThemedText type="smallBold" style={{ color: theme.toast.title }}>
                {message.title}
              </ThemedText>
              {message.body ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={{ color: theme.toast.body }}
                >
                  {message.body}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 1000,
    alignItems: "flex-start",
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two + Spacing.half,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
    maxWidth: 480,
  },
  copy: {
    gap: Spacing.half,
  },
});