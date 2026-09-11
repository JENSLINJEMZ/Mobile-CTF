import { useState } from "react";
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Solid text input: opaque field fill with a hairline border and a themed
 * focus ring. The TextInput itself stays transparent so the field color shows
 * through uniformly.
 */
export function Input({
  containerStyle,
  style,
  multiline = false,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.field,
        multiline && styles.fieldMultiline,
        {
          backgroundColor: theme.input.bg,
          borderColor: focused ? theme.input.focusBorder : theme.borderStrong,
          transform: [{ scale: focused && !reduceMotion ? 1.01 : 1 }],
        },
        containerStyle,
      ]}
    >
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={theme.input.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: theme.input.value },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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