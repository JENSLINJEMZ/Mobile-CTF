import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from "react-native-svg";

import { LucideIcon } from "@/components/lucide-icon";
import { C } from "@/constants/design";

function MiniAvatar() {
  return (
    <Svg viewBox="0 0 40 40" width="100%" height="100%">
      <Defs>
        <SvgLinearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#1a1030" />
          <Stop offset="100%" stopColor="#0a0616" />
        </SvgLinearGradient>
        <SvgLinearGradient id="avHood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#6d28d9" />
          <Stop offset="100%" stopColor="#2a1a52" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="40" height="40" fill="url(#avBg)" rx="20" />
      <Path d="M20 6 Q30 8 30 18 Q30 30 20 34 Q10 30 10 18 Q10 8 20 6Z" fill="url(#avHood)" />
      <Ellipse cx="20" cy="21" rx="6" ry="7" fill="#05030c" />
      <Circle cx="17.5" cy="20" r="1" fill="#22d3ee" />
      <Circle cx="22.5" cy="20" r="1" fill="#22d3ee" />
      <Path d="M14 33 q6 -4 12 0 l4 7H10Z" fill="#0d0818" />
    </Svg>
  );
}

export function AppHeader({
  level,
  unreadCount = 0,
}: {
  level: number;
  unreadCount?: number;
}) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Svg width={30} height={22} viewBox="0 0 40 28">
          <Defs>
            <SvgLinearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#c4b5fd" />
              <Stop offset="55%" stopColor="#8b5cf6" />
              <Stop offset="100%" stopColor="#6d28d9" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z" fill="url(#brandGrad)" />
        </Svg>
        <View>
          <Text style={styles.brandName}>
            Mobile <Text style={styles.brandCtf}>CTF</Text>
          </Text>
          <Text style={styles.brandTagline}>Learn · Hack · Compete</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
          <LucideIcon name="bell" size={20} color={C.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
        >
          <View style={styles.avatarBox}>
            <MiniAvatar />
          </View>
          <Text style={styles.avatarLv}>Lv. {level}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brandName: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
    lineHeight: 20,
  },
  brandCtf: {
    color: C.purple,
  },
  brandTagline: {
    fontSize: 8.5,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.textMuted,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#f43f5e",
    borderWidth: 1.5,
    borderColor: C.bgPrimary,
  },
  avatarWrap: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,.6)",
  },
  avatarLv: {
    fontSize: 9.5,
    fontWeight: "700",
    color: C.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});