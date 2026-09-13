import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";

/** 3D box stack art for the Isolated Environment card (ported 1:1). */
export function IsoArt() {
  return (
    <Svg
      width="130"
      height="96"
      viewBox="0 0 130 96"
      fill="none"
      aria-hidden
    >
      <Defs>
        <LinearGradient id="isoT" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7c3aed" />
          <Stop offset="100%" stopColor="#5b21b6" />
        </LinearGradient>
        <LinearGradient id="isoL" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#5b21b6" />
          <Stop offset="100%" stopColor="#2a1a52" />
        </LinearGradient>
        <LinearGradient id="isoR" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8b5cf6" />
          <Stop offset="100%" stopColor="#3b2570" />
        </LinearGradient>
      </Defs>
      <G transform="translate(58 4) scale(.85)">
        <Path d="M28 10 L50 22 L28 34 L6 22 Z" fill="url(#isoT)" />
        <Path d="M6 22 L28 34 L28 60 L6 48 Z" fill="url(#isoL)" />
        <Path d="M50 22 L28 34 L28 60 L50 48 Z" fill="url(#isoR)" />
      </G>
      <G transform="translate(0 22) scale(.95)">
        <Path d="M28 10 L50 22 L28 34 L6 22 Z" fill="url(#isoT)" />
        <Path d="M6 22 L28 34 L28 60 L6 48 Z" fill="url(#isoL)" />
        <Path d="M50 22 L28 34 L28 60 L50 48 Z" fill="url(#isoR)" />
        <G stroke="#22d3ee" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" fill="none">
          <Path d="M14 28 h8" />
          <Path d="M14 34 h12" />
          <Path d="M14 40 h6" />
          <Path d="M34 28 h6" />
          <Path d="M34 34 h8" />
          <Path d="M34 40 h5" />
        </G>
      </G>
      <G transform="translate(62 30) scale(.85)">
        <Path d="M28 10 L50 22 L28 34 L6 22 Z" fill="url(#isoT)" />
        <Path d="M6 22 L28 34 L28 60 L6 48 Z" fill="url(#isoL)" />
        <Path d="M50 22 L28 34 L28 60 L50 48 Z" fill="url(#isoR)" />
      </G>
    </Svg>
  );
}