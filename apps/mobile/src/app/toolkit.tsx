import {
  analyzeFrequency,
  caesar,
  decodeBase64,
  decodeJwt,
  encodeBase64,
  hexDump,
  hexToBytes,
  identifyHash,
  parseExif,
  rot13,
  sniffFileType,
  urlDecode,
  urlEncode,
  utf8ToBytes,
  vigenere,
  xorWithKey,
} from "@ctf/toolkit";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { GlassInput } from "@/components/glass-input";
import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const SECTIONS = ["Encoding", "Ciphers", "Hash ID", "JWT", "Files"] as const;
type Section = (typeof SECTIONS)[number];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid input";
}

function SectionChips({
  active,
  onChange,
}: {
  active: Section;
  onChange: (section: Section) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.chips}>
      {SECTIONS.map((value) => {
        const isActive = value === active;
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            accessibilityRole="button"
            accessibilityLabel={`${value} tools`}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.chip,
              isActive && [styles.chipActive, { backgroundColor: theme.accent }],
              !isActive && [
                styles.chipIdle,
                { backgroundColor: theme.glassSubtle, borderColor: theme.glassBorder },
              ],
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: isActive ? theme.onAccent : theme.text }}
            >
              {value}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

function ToolCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassSurface radius={Radius.md} style={styles.card}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </GlassSurface>
  );
}

function TextArea({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <GlassInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={accessibilityLabel ?? placeholder}
    />
  );
}

function OutputBlock({ value, error }: { value: string; error?: string }) {
  const theme = useTheme();
  if (error) {
    return (
      <ThemedText style={{ color: theme.danger }} accessibilityRole="alert">
        {error}
      </ThemedText>
    );
  }
  if (!value) return null;
  return (
    <GlassSurface variant="subtle" radius={Radius.sm} style={styles.outputBox}>
      <ThemedText selectable style={styles.output}>
        {value}
      </ThemedText>
    </GlassSurface>
  );
}

function ModeSwitch({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.modeRow}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.modeChip,
              {
                borderColor: isActive ? theme.accent : theme.borderStrong,
                backgroundColor: isActive ? theme.accent : "transparent",
              },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: isActive ? theme.onAccent : theme.text }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

function EncodingTool() {
  const theme = useTheme();
  const [mode, setMode] = useState("base64");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    try {
      setError(null);
      if (!input) {
        setOutput("");
        return;
      }
      if (mode === "rot13") {
        setOutput(rot13(input));
      } else if (direction === "encode") {
        if (mode === "base64") setOutput(encodeBase64(input));
        if (mode === "hex") {
          setOutput(
            Array.from(utf8ToBytes(input), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join(" "),
          );
        }
        if (mode === "url") setOutput(urlEncode(input));
      } else {
        if (mode === "base64") setOutput(decodeBase64(input));
        if (mode === "hex") {
          setOutput(String.fromCharCode(...hexToBytes(input)));
        }
        if (mode === "url") setOutput(urlDecode(input));
      }
    } catch (err) {
      setOutput("");
      setError(errorText(err));
    }
  };

  return (
    <ToolCard title="Encoding">
      <ThemedText type="small" themeColor="textSecondary">
        Base64, hex, URL encoding and ROT13 — fully offline.
      </ThemedText>
      <ModeSwitch
        options={[
          { label: "Base64", value: "base64" },
          { label: "Hex", value: "hex" },
          { label: "URL", value: "url" },
          { label: "ROT13", value: "rot13" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode !== "rot13" ? (
        <ModeSwitch
          options={[
            { label: "Encode", value: "encode" },
            { label: "Decode", value: "decode" },
          ]}
          value={direction}
          onChange={(value) => setDirection(value as "encode" | "decode")}
        />
      ) : null}
      <TextArea
        value={input}
        onChangeText={setInput}
        placeholder={
          mode === "hex" && direction === "decode"
            ? "Paste hex bytes…"
            : "Paste text…"
        }
        multiline
      />
      <Pressable
        onPress={run}
        accessibilityRole="button"
        accessibilityLabel={direction === "encode" || mode === "rot13" ? "Run transformation" : "Decode input"}
        style={({ pressed }) => [
          styles.actionButton,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.actionLabel}>
          {direction === "encode" || mode === "rot13" ? "Transform" : "Decode"}
        </ThemedText>
      </Pressable>
      <OutputBlock value={output} error={error ?? undefined} />
    </ToolCard>
  );
}

function CipherTool() {
  const theme = useTheme();
  const [cipher, setCipher] = useState("caesar");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!text) {
      setResult("");
      return;
    }
    setError(null);
    if (cipher === "frequency") return;
    try {
      if (cipher === "caesar") {
        const shift = Number.parseInt(key, 10);
        const normalized = Number.isNaN(shift) ? 0 : ((shift % 26) + 26) % 26;
        setResult(caesar(text, normalized, mode === "decrypt"));
      } else if (cipher === "vigenere") {
        setResult(vigenere(text, key, mode === "decrypt"));
      } else if (cipher === "xor") {
        setResult(xorWithKey(text, key));
      }
    } catch (err) {
      setResult("");
      setError(errorText(err));
    }
  };

  const frequency = analyzeFrequency(text);

  return (
    <ToolCard title="Ciphers">
      <ThemedText type="small" themeColor="textSecondary">
        Caesar, Vigenère, XOR and English frequency analysis — all local.
      </ThemedText>
      <ModeSwitch
        options={[
          { label: "Caesar", value: "caesar" },
          { label: "Vigenère", value: "vigenere" },
          { label: "XOR", value: "xor" },
          { label: "Frequency", value: "frequency" },
        ]}
        value={cipher}
        onChange={setCipher}
      />
      {cipher !== "frequency" ? (
        <ModeSwitch
          options={[
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ]}
          value={mode}
          onChange={(value) => setMode(value as "encrypt" | "decrypt")}
        />
      ) : null}
      <TextArea
        value={text}
        onChangeText={setText}
        placeholder="Plaintext or ciphertext…"
        multiline
      />
      {cipher === "caesar" ? (
        <TextArea
          value={key}
          onChangeText={setKey}
          placeholder="Shift (e.g. 13)"
          multiline={false}
        />
      ) : null}
      {cipher === "vigenere" || cipher === "xor" ? (
        <TextArea
          value={key}
          onChangeText={setKey}
          placeholder={cipher === "vigenere" ? "Keyword (letters only)" : "KEY"}
          multiline={false}
        />
      ) : null}
      {cipher !== "frequency" ? (
        <Pressable
          onPress={run}
          accessibilityRole="button"
          accessibilityLabel={
            cipher === "caesar" || cipher === "vigenere"
              ? `${mode === "encrypt" ? "Encrypt" : "Decrypt"} with ${cipher}`
              : "Run XOR transformation"
          }
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.actionLabel}>Transform</ThemedText>
        </Pressable>
      ) : null}
      {cipher !== "frequency" ? (
        <OutputBlock value={result} error={error ?? undefined} />
      ) : null}

      {cipher === "frequency" && text ? (
        <ThemedView style={styles.freqBox}>
          {frequency.letters.slice(0, 8).map((entry) => {
            const top = frequency.letters[0]?.count ?? 1;
            const width = Math.max(4, Math.round((entry.count / top) * 100));
            return (
              <ThemedView key={entry.letter} style={styles.freqRow}>
                <ThemedText type="small" style={styles.freqLetter}>
                  {entry.letter}
                </ThemedText>
                <ThemedView style={styles.freqTrack}>
                  <ThemedView
                    style={[
                      styles.freqBar,
                      { width: `${width}%`, backgroundColor: theme.accent },
                    ]}
                  />
                </ThemedView>
                <ThemedText type="small" style={styles.freqCount}>
                  {entry.count} ({entry.percentage}%)
                </ThemedText>
              </ThemedView>
            );
          })}
          {frequency.topTrigrams.length > 0 ? (
            <ThemedView style={styles.trigramBox}>
              <ThemedText type="smallBold">Top trigrams</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {frequency.topTrigrams
                  .map((entry) => `${entry.trigram} (${entry.count})`)
                  .join(" · ")}
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>
      ) : null}
    </ToolCard>
  );
}

function HashIdentifyTool() {
  const theme = useTheme();
  const [input, setInput] = useState("");
  const result = identifyHash(input);

  return (
    <ToolCard title="Hash identifier">
      <ThemedText type="small" themeColor="textSecondary">
        Pattern-matches common hash formats by length and scheme.
      </ThemedText>
      <TextArea
        value={input}
        onChangeText={setInput}
        placeholder="Paste a hash…"
        multiline
      />
      {result.candidates.length === 0 && input.trim() ? (
        <ThemedText style={{ color: theme.danger }} accessibilityRole="alert">
          No known hash format matches.
        </ThemedText>
      ) : null}
      {result.candidates.map((candidate) => (
        <GlassSurface key={candidate.name} variant="subtle" radius={Radius.sm} style={styles.hashRow}>
          <ThemedText type="smallBold">{candidate.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {candidate.hexLength != null
              ? `${candidate.hexLength} hex chars`
              : "prefixed format"}{" "}
            · {candidate.description}
          </ThemedText>
        </GlassSurface>
      ))}
      {input.trim() ? (
        <ThemedText type="small" themeColor="textSecondary">
          Character set: {result.characterSet}
        </ThemedText>
      ) : null}
    </ToolCard>
  );
}

function JwtDecodeTool() {
  const theme = useTheme();
  const [input, setInput] = useState("");
  const decoded = decodeJwt(input);
  const hasInput = input.trim().length > 0;

  return (
    <ToolCard title="JWT decoder">
      <ThemedText type="small" themeColor="textSecondary">
        Structural decode only — signatures are never verified.
      </ThemedText>
      <TextArea
        value={input}
        onChangeText={setInput}
        placeholder="Paste a JWT (header.payload.signature)…"
        multiline
      />
      {hasInput && !decoded.validStructure ? (
        <ThemedText style={{ color: theme.danger }} accessibilityRole="alert">
          {decoded.errors.join(" ")}
        </ThemedText>
      ) : null}
      {hasInput && decoded.validStructure ? (
        <GlassSurface variant="subtle" radius={Radius.sm} style={styles.jwtBlock}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Header
          </ThemedText>
          <ThemedText selectable style={styles.output}>
            {JSON.stringify(decoded.header, null, 2)}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Payload
          </ThemedText>
          <ThemedText selectable style={styles.output}>
            {JSON.stringify(decoded.payload, null, 2)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Signature: {decoded.signature.slice(0, 24)}
            {decoded.signature.length > 24 ? "…" : ""}
          </ThemedText>
          {decoded.payload?.exp != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Expires:{" "}
              {new Date((decoded.payload.exp as number) * 1000).toString()}
              {decoded.expiresInSeconds != null
                ? decoded.expiresInSeconds >= 0
                  ? ` (in ${decoded.expiresInSeconds}s)`
                  : " (expired)"
                : ""}
            </ThemedText>
          ) : null}
        </GlassSurface>
      ) : null}
    </ToolCard>
  );
}

function FileAnalyzeTool() {
  const theme = useTheme();
  const [input, setInput] = useState("");
  const analysis = useMemo(() => {
    if (!input.trim()) return null;
    try {
      const bytes = hexToBytes(input);
      const type = sniffFileType(bytes);
      const exif = parseExif(bytes);
      const lines: string[] = [];
      if (type) {
        lines.push(`Type: ${type.name}`);
        lines.push(`Extensions: ${type.extensions.join(", ")}`);
        lines.push(`MIME: ${type.mime}`);
      } else {
        lines.push("Type: unknown");
      }
      lines.push(`Size: ${bytes.length} bytes`);
      const exifLines: string[] = [];
      if (exif) {
        const make = exif.make ? `Make: ${exif.make}` : "";
        const model = exif.model ? `Model: ${exif.model}` : "";
        const date = exif.dateTime ? `Date: ${exif.dateTime}` : "";
        const lat = exif.gpsLatitude;
        const lon = exif.gpsLongitude;
        const gps = lat != null && lon != null ? `GPS: ${lat}, ${lon}` : "";
        const camera = [make, model].filter(Boolean).join(" · ");
        if (camera) exifLines.push(camera);
        if (date) exifLines.push(date);
        if (exif.orientation)
          exifLines.push(`Orientation: ${exif.orientation}`);
        if (gps) exifLines.push(gps);
      }
      const body =
        exifLines.length > 0 ? `\nEXIF:\n${exifLines.join("\n")}` : "";
      return { dump: `${lines.join("\n")}${body}\n\n${hexDump(bytes)}` };
    } catch (err) {
      return { error: errorText(err) };
    }
  }, [input]);

  return (
    <ToolCard title="Hex / file analysis">
      <ThemedText type="small" themeColor="textSecondary">
        Paste raw hex bytes (from `xxd`, `od -tx1`, or a file dump) to inspect
        magic bytes, size, EXIF and offsets.
      </ThemedText>
      <TextArea
        value={input}
        onChangeText={setInput}
        placeholder="e.g. ff d8 ff e0 …"
        multiline
      />
      {analysis?.error ? (
        <ThemedText style={{ color: theme.danger }} accessibilityRole="alert">
          {analysis.error}
        </ThemedText>
      ) : null}
      {analysis?.dump ? (
        <OutputBlock value={analysis.dump} error={undefined} />
      ) : null}
    </ToolCard>
  );
}

export default function ToolkitScreen() {
  const [section, setSection] = useState<Section>("Encoding");

  return (
    <ScreenShell title="Toolkit">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <SectionChips active={section} onChange={setSection} />

          {section === "Encoding" ? <EncodingTool /> : null}
          {section === "Ciphers" ? <CipherTool /> : null}
          {section === "Hash ID" ? <HashIdentifyTool /> : null}
          {section === "JWT" ? <JwtDecodeTool /> : null}
          {section === "Files" ? <FileAnalyzeTool /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
  },
  chipActive: {},
  chipIdle: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    width: "100%",
    padding: Spacing.three,
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  modeChip: {
    paddingHorizontal: Spacing.two + Spacing.half * 3,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  actionButton: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignSelf: "flex-start",
  },
  actionLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  outputBox: {
    padding: Spacing.two,
    width: "100%",
  },
  output: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  freqBox: {
    gap: Spacing.one,
    width: "100%",
  },
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  freqLetter: {
    width: 24,
    textTransform: "uppercase",
  },
  freqTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(128,128,128,0.25)",
    overflow: "hidden",
  },
  freqBar: {
    height: 12,
    borderRadius: 6,
  },
  freqCount: {
    minWidth: 90,
    textAlign: "right",
  },
  trigramBox: {
    gap: Spacing.half,
    marginTop: Spacing.two,
  },
  hashRow: {
    gap: Spacing.half,
    padding: Spacing.two,
  },
  jwtBlock: {
    gap: Spacing.half,
    width: "100%",
    padding: Spacing.two,
  },
});
