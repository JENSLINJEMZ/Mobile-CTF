import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';

export default function ToolkitScreen() {
  return (
    <ScreenShell title="Toolkit">
      <ThemedText>
        Offline tools — encoding, crypto, hash/JWT decoding, file analysis. Lands in Stage 4.
      </ThemedText>
    </ScreenShell>
  );
}