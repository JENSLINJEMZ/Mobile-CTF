import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type GlassInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Text input seated in the liquid-glass material: translucent fill, hairline
 * border and specular rim. The TextInput itself stays transparent so the
 * material shows through uniformly.
 */
export function GlassInput({
  containerStyle,
  style,
  multiline = false,
  ...rest
}: GlassInputProps) {
  const theme = useTheme();

  return (
    <GlassSurface
      variant="strong"
      radius={Radius.md}
      style={[styles.field, multiline && styles.fieldMultiline, containerStyle]}
    >
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={theme.placeholder}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: theme.text },
          style,
        ]}
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  field: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
  },
  fieldMultiline: {
    alignItems: "flex-start",
  },
  input: {
    fontSize: 15,
    paddingVertical: 0,
  },
  inputMultiline: {
    textAlignVertical: "top",
    minHeight: 96,
    lineHeight: 22,
  },
});