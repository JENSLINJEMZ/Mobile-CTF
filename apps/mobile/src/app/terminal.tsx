import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';

export default function TerminalScreen() {
  return (
    <ScreenShell title="Terminal">
      <ThemedText>
        Sandboxed in-app terminal (expo-router WebView/xterm route). Sandbox gateway lands in
        Stage 5.
      </ThemedText>
    </ScreenShell>
  );
}