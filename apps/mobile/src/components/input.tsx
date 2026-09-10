import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Solid text input: opaque field fill with a hairline border. The TextInput
 * itself stays transparent so the field color shows through uniformly.
 */
export function Input({
  containerStyle,
  style,
  multiline = false,
  ...rest
}: InputProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.field,
        multiline && styles.fieldMultiline,
        { backgroundColor: theme.backgroundElement, borderColor: theme.borderStrong },
        containerStyle,
      ]}
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