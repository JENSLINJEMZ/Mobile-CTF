import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from "react-native-svg";

export function GradientText({
  text,
  style,
  width,
  colors,
  numberOfLines = 3,
}: {
  text: string;
  style: TextStyle;
  width: number;
  colors: string[];
  numberOfLines?: number;
}) {
  const [lines, setLines] = useState<{ text: string; ascender: number }[]>([]);
  const [measured, setMeasured] = useState(false);

  const fontSize = style.fontSize ?? 16;
  const lineHeight = style.lineHeight ?? fontSize * 1.2;
  const fontFamily = style.fontFamily;
  const fontStyle = style.fontStyle;
  const fontWeight = style.fontWeight;
  const letterSpacing = style.letterSpacing;

  const gradientId = useMemo(() => `gradText_${Math.random().toString(36).slice(2, 8)}`, []);

  const totalHeight = Math.max(lines.length * lineHeight, lineHeight);

  if (!measured) {
    return (
      <View style={{ width }}>
        <Text
          numberOfLines={numberOfLines}
          style={[style, styles.measurer]}
          onTextLayout={(e) => {
            setLines(
              e.nativeEvent.lines.map((l) => ({ text: l.text, ascender: l.ascender })),
            );
            setMeasured(true);
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  const ascender = lines[0]?.ascender || fontSize * 0.88;

  return (
    <View style={{ width, height: totalHeight }}>
      <Svg width={width} height={totalHeight}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
            {colors.map((c, i) => (
              <Stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </SvgLinearGradient>
        </Defs>
        {lines.map((l, i) => (
          <SvgText
            key={i}
            x={0}
            y={ascender + i * lineHeight}
            fill={`url(#${gradientId})`}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontStyle={fontStyle}
            fontWeight={fontWeight}
            letterSpacing={letterSpacing}
          >
            {l.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  measurer: {
    position: "absolute",
    opacity: 0,
  },
});