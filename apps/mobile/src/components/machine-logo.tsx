import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop, Text } from "react-native-svg";

export type MachineLogoName = "ubuntu" | "kali" | "db" | "dvwa";

function Ubuntu({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="26" fill="#f97316" />
      <Circle cx="30" cy="30" r="7" fill="#fff" />
      <Circle cx="30" cy="30" r="3.4" fill="#f97316" />
      <G stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <Path d="M19.8 24.4 A 12.5 12.5 0 0 1 30 16" />
        <Path d="M40.2 24.4 A 12.5 12.5 0 0 1 40.2 35.6" />
        <Path d="M19.8 35.6 A 12.5 12.5 0 0 0 30 44" />
      </G>
      <Circle cx="21" cy="22" r="2.4" fill="#fff" />
      <Circle cx="42" cy="30" r="2.4" fill="#fff" />
      <Circle cx="21" cy="38" r="2.4" fill="#fff" />
    </Svg>
  );
}

function Kali({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <G fill="#e2e8f0">
        <Path d="M14 20 Q22 12 32 14 Q28 16 26 20 Q24 24 26 28 Q20 26 16 28 Q12 24 14 20Z" />
        <Path d="M32 14 Q44 14 50 22 Q44 22 40 26 Q42 30 40 34 Q34 32 30 34 Q28 28 30 22 Q30 16 32 14Z" />
        <Path d="M26 28 Q30 30 30 36 Q28 40 24 40 Q26 36 26 28Z" />
        <Path d="M40 34 Q42 40 38 44 Q36 40 34 38 Q36 34 40 34Z" />
      </G>
      <Circle cx="35" cy="22" r="1.4" fill="#0d0b18" />
    </Svg>
  );
}

function Db({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="dbTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#60a5fa" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
        <LinearGradient id="dbBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#3b82f6" />
          <Stop offset="100%" stopColor="#1e40af" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="30" cy="14" rx="18" ry="6" fill="url(#dbTop)" />
      <Path d="M12 14 V24 Q12 30 30 30 Q48 30 48 24 V14 Q48 20 30 20 Q12 20 12 14Z" fill="url(#dbBody)" />
      <Ellipse cx="30" cy="24" rx="18" ry="6" fill="url(#dbTop)" opacity="0.9" />
      <Path d="M12 24 V34 Q12 40 30 40 Q48 40 48 34 V24 Q48 30 30 30 Q12 30 12 24Z" fill="url(#dbBody)" />
      <Ellipse cx="30" cy="34" rx="18" ry="6" fill="url(#dbTop)" opacity="0.9" />
      <Path d="M12 34 V44 Q12 50 30 50 Q48 50 48 44 V34 Q48 40 30 40 Q12 40 12 34Z" fill="url(#dbBody)" />
      <Ellipse cx="30" cy="44" rx="18" ry="6" fill="url(#dbTop)" />
    </Svg>
  );
}

function Dvwa({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="dvwaRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#a3e635" />
          <Stop offset="100%" stopColor="#65a30d" />
        </LinearGradient>
      </Defs>
      <Path d="M42 8 A 22 22 0 1 0 52 30" stroke="url(#dvwaRing)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M52 30 A 22 22 0 0 1 42 52" stroke="url(#dvwaRing)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
      <Text
        x="30"
        y="36"
        textAnchor="middle"
        fontSize="14"
        fontWeight="900"
        fill="#e2e8f0"
        letterSpacing={-0.5}
      >
        DVWA
      </Text>
    </Svg>
  );
}

export function MachineLogo({ name, size }: { name: MachineLogoName; size: number }) {
  switch (name) {
    case "ubuntu":
      return <Ubuntu size={size} />;
    case "kali":
      return <Kali size={size} />;
    case "db":
      return <Db size={size} />;
    case "dvwa":
      return <Dvwa size={size} />;
  }
}