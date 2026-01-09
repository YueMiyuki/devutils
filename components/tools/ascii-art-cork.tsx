"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Braces, Copy, Loader2, Palette, Sparkles, Wand2 } from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import figlet from "figlet";

interface ASCIIArtCorkProps {
  tabId: string;
}

type FontOption = "Standard" | "Slant" | "Big" | "Ghost" | "Doom";

const fontImports: Record<FontOption, () => Promise<{ default: string }>> = {
  Standard: () => import("figlet/importable-fonts/Standard.js"),
  Slant: () => import("figlet/importable-fonts/Slant.js"),
  Big: () => import("figlet/importable-fonts/Big.js"),
  Ghost: () => import("figlet/importable-fonts/Ghost.js"),
  Doom: () => import("figlet/importable-fonts/Doom.js"),
};

const samples = ["DevUtils", "ASCII Wizard", "Ship it!", "Full Duplex"];

export function ASCIIArtCork({ tabId: _tabId }: ASCIIArtCorkProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("DevUtils");
  const [font, setFont] = useState<FontOption>("Standard");
  const [art, setArt] = useState("");
  const [loading, setLoading] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [frame, setFrame] = useState(false);
  const [padding, setPadding] = useState("1");
  const loadedFontsRef = useRef<Set<FontOption>>(new Set());
  const { copyWithAnimation } = useCopyAnimation();
  void _tabId;

  const fontLabels = useMemo(
    () => ({
      Standard: t("tools.asciiCork.fonts.standard"),
      Slant: t("tools.asciiCork.fonts.slant"),
      Big: t("tools.asciiCork.fonts.big"),
      Ghost: t("tools.asciiCork.fonts.ghost"),
      Doom: t("tools.asciiCork.fonts.doom"),
    }),
    [t],
  );

  // Fonts stay dynamically loaded instead of bloating the main bundle.
  const ensureFont = useCallback(async (fontName: FontOption) => {
    if (loadedFontsRef.current.has(fontName)) return;
    const fontModule = await fontImports[fontName]();
    figlet.parseFont(fontName, fontModule.default);
    loadedFontsRef.current.add(fontName);
  }, []);

  const withFrame = useCallback(
    (ascii: string): string => {
      if (!frame) return ascii;
      const lines = ascii.split("\n");
      const width = Math.max(...lines.map((l) => l.length));
      const topBottom = `+${"-".repeat(width + 2)}+`;
      const padded = lines.map((line) => `| ${line.padEnd(width, " ")} |`);
      return [topBottom, ...padded, topBottom].join("\n");
    },
    [frame],
  );

  const withPadding = useCallback(
    (ascii: string): string => {
      const padSize = Number(padding);
      if (!padSize) return ascii;
      const pad = " ".repeat(padSize);
      return ascii
        .split("\n")
        .map((line) => `${pad}${line}${pad}`)
        .join("\n");
    },
    [padding],
  );

  const render = useCallback(
    async (value: string) => {
      // Don't block
      const baseText = uppercase ? value.toUpperCase() : value;
      if (!baseText.trim()) {
        setArt("");
        return;
      }

      setLoading(true);
      try {
        await ensureFont(font);
        const options = {
          font,
          horizontalLayout: "default",
          verticalLayout: "default",
          width: 120,
        } as figlet.Options;

        const ascii = figlet.textSync(
          baseText,
          options as Parameters<typeof figlet.textSync>[1],
        );

        const finalArt = withFrame(withPadding(ascii));
        setArt(finalArt);
      } catch (err) {
        setArt(
          err instanceof Error ? err.message : "Unable to render ASCII art.",
        );
      } finally {
        setLoading(false);
      }
    },
    [ensureFont, font, withFrame, withPadding, uppercase],
  );

  useEffect(() => {
    void render(text);
  }, [font, frame, padding, text, uppercase, render]);

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {t("tools.asciiCork.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tools.asciiCork.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => copyWithAnimation(art)}
          disabled={!art}
        >
          <Copy className="w-4 h-4" />
          {t("tools.asciiCork.actions.copy")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Braces className="w-4 h-4" />
              {t("tools.asciiCork.input.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.asciiCork.input.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("tools.asciiCork.input.placeholder")}
            />
            <div className="flex flex-wrap gap-2">
              {samples.map((sample) => (
                <Badge
                  key={sample}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setText(sample)}
                >
                  {sample}
                </Badge>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("tools.asciiCork.input.font")}
                  </span>
                </div>
                <Select
                  value={font}
                  onValueChange={(value: FontOption) => setFont(value)}
                >
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">
                      {fontLabels.Standard}
                    </SelectItem>
                    <SelectItem value="Slant">{fontLabels.Slant}</SelectItem>
                    <SelectItem value="Big">{fontLabels.Big}</SelectItem>
                    <SelectItem value="Ghost">{fontLabels.Ghost}</SelectItem>
                    <SelectItem value="Doom">{fontLabels.Doom}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("tools.asciiCork.input.padding")}
                </span>
                <Select
                  value={padding}
                  onValueChange={(value: string) => setPadding(value)}
                >
                  <SelectTrigger size="sm" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("tools.asciiCork.input.uppercase")}
                </span>
                <Switch checked={uppercase} onCheckedChange={setUppercase} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("tools.asciiCork.input.frame")}
                </span>
                <Switch checked={frame} onCheckedChange={setFrame} />
              </div>
              <Button
                className="w-full gap-2"
                variant="secondary"
                onClick={() => void render(text)}
              >
                <Wand2 className="w-4 h-4" />
                {t("tools.asciiCork.actions.render")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t("tools.asciiCork.output.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.asciiCork.output.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="relative h-full">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md z-10">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
              <Textarea
                value={art}
                readOnly
                className="min-h-[320px] h-full font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
