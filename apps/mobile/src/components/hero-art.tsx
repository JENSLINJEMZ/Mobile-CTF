import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

/**
 * Night-city hero backdrop ported 1:1 from the design mock
 * (coordinates + gradients from /home/jemzi/Developement/UI).
 */
export function HeroArt() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0d0820" />
          <Stop offset="28%" stopColor="#291849" />
          <Stop offset="52%" stopColor="#5b2f68" />
          <Stop offset="74%" stopColor="#a84f68" />
          <Stop offset="88%" stopColor="#e0824f" />
          <Stop offset="100%" stopColor="#f4ab5e" />
        </LinearGradient>
        <RadialGradient id="sunGlow" cx="0.6" cy="0.82" r="0.55">
          <Stop offset="0%" stopColor="#ffd79a" stopOpacity="0.85" />
          <Stop offset="55%" stopColor="#ff9a4d" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#ff9a4d" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#3c2555" />
          <Stop offset="100%" stopColor="#1a1030" />
        </LinearGradient>
        <LinearGradient id="mtnNear" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#170f2a" />
          <Stop offset="100%" stopColor="#08050f" />
        </LinearGradient>
        <RadialGradient id="cityGlow" cx="0.5" cy="1" r="0.75">
          <Stop offset="0%" stopColor="#ffae5e" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#ffae5e" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="phoneGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor="#7fe9ff" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#7fe9ff" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect width="400" height="260" fill="url(#skyGrad)" />
      <Rect width="400" height="260" fill="url(#sunGlow)" />

      <G opacity={0.32} fill="#2b1638">
        <Ellipse cx="80" cy="54" rx="86" ry="15" />
        <Ellipse cx="300" cy="40" rx="74" ry="12" />
        <Ellipse cx="200" cy="86" rx="118" ry="13" />
      </G>
      <G opacity={0.45} fill="#83456a">
        <Ellipse cx="115" cy="112" rx="72" ry="7" />
        <Ellipse cx="292" cy="122" rx="92" ry="8" />
      </G>

      <Path
        d="M0 168 L44 130 L84 154 L128 112 L172 150 L214 122 L258 158 L308 126 L354 156 L400 132 L400 260 L0 260Z"
        fill="url(#mtnFar)"
      />
      <Path
        d="M0 202 L58 162 L108 196 L164 156 L224 198 L278 166 L338 202 L400 172 L400 260 L0 260Z"
        fill="url(#mtnNear)"
      />

      <Rect x="0" y="192" width="400" height="68" fill="url(#cityGlow)" />

      <G fill="#ffc27a" opacity={0.85}>
        <Circle cx="36" cy="212" r="1.1" />
        <Circle cx="52" cy="206" r="0.9" />
        <Circle cx="68" cy="216" r="1.3" />
        <Circle cx="86" cy="208" r="0.8" />
        <Circle cx="104" cy="214" r="1.2" />
        <Circle cx="122" cy="205" r="0.9" />
        <Circle cx="142" cy="218" r="1.1" />
        <Circle cx="160" cy="209" r="0.8" />
        <Circle cx="180" cy="215" r="1.3" />
        <Circle cx="200" cy="207" r="0.9" />
        <Circle cx="222" cy="219" r="1.1" />
        <Circle cx="244" cy="210" r="0.8" />
        <Circle cx="266" cy="216" r="1.2" />
        <Circle cx="288" cy="206" r="0.9" />
        <Circle cx="310" cy="214" r="1.1" />
        <Circle cx="332" cy="209" r="0.8" />
        <Circle cx="352" cy="217" r="1.3" />
        <Circle cx="372" cy="208" r="0.9" />
        <Circle cx="390" cy="215" r="1.0" />
      </G>
      <G fill="#8ad9ff" opacity={0.55}>
        <Circle cx="60" cy="222" r="0.7" />
        <Circle cx="150" cy="224" r="0.8" />
        <Circle cx="238" cy="223" r="0.7" />
        <Circle cx="330" cy="225" r="0.8" />
      </G>

      <Rect x="0" y="218" width="400" height="42" fill="#07040e" />

      <G>
        <Path d="M208 232 Q236 202 288 206 Q326 210 342 232 Z" fill="#0c0918" />
        <Path
          d="M252 208 q-11 -19 2 -31 q7 -6 15 -4 l9 3 q11 5 13 17 l3 15 z"
          fill="#080613"
        />
        <Circle cx="265" cy="167" r="11.5" fill="#080613" />
        <Path
          d="M253 166 q2 -15 12.5 -15 q11.5 0 12 13 q-6.5 -6.5 -12.5 -5.5 q-8 1.3 -12 7.5z"
          fill="#05030c"
        />
        <Ellipse cx="281" cy="196" rx="24" ry="20" fill="url(#phoneGlow)" opacity={0.7} />
        <Rect
          x="275"
          y="184"
          width="7.5"
          height="12"
          rx="1.6"
          fill="#9ff0ff"
          transform="rotate(13 278 190)"
        />
      </G>
    </Svg>
  );
}