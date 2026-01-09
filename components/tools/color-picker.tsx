"use client";

import type React from "react";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import Sketch from "@uiw/react-color-sketch";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, remove } from "@tauri-apps/plugin-fs";
import { tempDir } from "@tauri-apps/api/path";

interface ColorPickerProps {
  tabId: string;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

const hexToRgb = (hex: string): RgbColor | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgbToHsl = (rgb: RgbColor): HslColor => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ColorPicker({ tabId: _tabId }: ColorPickerProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState<string>("#3b82f6");
  const [palette, setPalette] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("picker");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const isDark = resolvedTheme === "dark";

  const handleTauriFileDrop = useCallback(async (filePath: string) => {
    setIsProcessing(true);

    try {
      const colors = await invoke<string[]>("extract_palette_from_image", {
        filePath,
        numColors: 6,
      });

      setPalette(colors);
    } catch (error) {
      console.error("Error in handleTauriFileDrop:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Tauri listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // console.log("Setting up Tauri drag-drop listener...");

        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "drop") {
            // console.log("User dropped", event.payload.paths);

            const filePath = event.payload.paths[0];
            if (filePath && /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(filePath)) {
              // console.log("File path matches image pattern, calling handler");
              handleTauriFileDrop(filePath);
            } else {
              // console.log("File path does not match image pattern or is invalid");
            }
          }
        });

        // console.log("Tauri drag-drop listener registered successfully");
      } catch (error) {
        console.error("Error setting up Tauri listener:", error);
      }
    };

    setupListener();

    return () => {
      // console.log("Cleaning up Tauri drag-drop listener");
      if (unlisten) unlisten();
    };
  }, [handleTauriFileDrop]);

  const getColorFormats = useCallback(() => {
    const rgb = hexToRgb(color);
    if (!rgb) return null;

    const hsl = rgbToHsl(rgb);

    return {
      hex: color.toUpperCase(),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
      uiColor: `UIColor(red: ${(rgb.r / 255).toFixed(3)}, green: ${(rgb.g / 255).toFixed(3)}, blue: ${(rgb.b / 255).toFixed(3)}, alpha: 1.0)`,
      swiftui: `Color(red: ${(rgb.r / 255).toFixed(3)}, green: ${(rgb.g / 255).toFixed(3)}, blue: ${(rgb.b / 255).toFixed(3)})`,
      android: `#${color.slice(1).toUpperCase()}`,
      css: `--color-primary: ${color};`,
    };
  }, [color]);

  const handleColorChange = (newColor: string) => {
    // Ensure valid hex color
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      setColor(newColor);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setIsProcessing(true);
    try {
      // Write to temp location
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const tempDirectory = await tempDir();
      const tempPath = `${tempDirectory}/color_picker_${Date.now()}_${file.name}`;
      await writeFile(tempPath, uint8Array);

      const colors = await invoke<string[]>("extract_palette_from_image", {
        filePath: tempPath,
        numColors: 6,
      });

      setPalette(colors);

      // Clean up
      try {
        await remove(tempPath);
      } catch (cleanupError) {
        console.warn("Failed to clean up temp file:", cleanupError);
      }
    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateHarmonies = (): { name: string; colors: string[] }[] => {
    const rgb = hexToRgb(color);
    if (!rgb) return [];

    const hsl = rgbToHsl(rgb);

    return [
      {
        name: t("tools.colorPicker.harmonies.complementary"),
        colors: [color, hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)],
      },
      {
        name: t("tools.colorPicker.harmonies.triadic"),
        colors: [
          color,
          hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
          hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
        ],
      },
      {
        name: t("tools.colorPicker.harmonies.analogous"),
        colors: [
          hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
          color,
          hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
        ],
      },
      {
        name: t("tools.colorPicker.harmonies.splitComplementary"),
        colors: [
          color,
          hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
          hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
        ],
      },
      {
        name: t("tools.colorPicker.harmonies.monochromatic"),
        colors: [
          hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 20)),
          hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 10)),
          color,
          hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 10)),
          hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 20)),
        ],
      },
    ];
  };

  const clearAll = () => {
    setColor("#3b82f6");
    setPalette([]);
  };

  const formats = getColorFormats();

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="picker">
            {t("tools.colorPicker.pickerTab")}
          </TabsTrigger>
          <TabsTrigger value="palette">
            {t("tools.colorPicker.paletteTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Color Picker */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {t("tools.colorPicker.currentColor")}
                  </CardTitle>
                  <CardDescription>
                    {t("tools.colorPicker.currentColorDescription")}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("common.clear")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-full [&_.w-color-sketch]:shadow-none!",
                    isDark && [
                      "[&_.w-color-sketch]:bg-card!",
                      "[&_.w-color-sketch]:border-border!",
                      "[&_.w-color-sketch_input]:bg-background!",
                      "[&_.w-color-sketch_input]:text-foreground!",
                      "[&_.w-color-sketch_input]:border-border!",
                      "[&_.w-color-editable-input-label]:text-muted-foreground!",
                    ],
                  )}
                >
                  <Sketch
                    color={color}
                    onChange={(color) => {
                      handleColorChange(color.hex);
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: isDark ? "hsl(var(--card))" : "#fff",
                      boxShadow: "none",
                      border: isDark
                        ? "1px solid hsl(var(--border))"
                        : "1px solid #e5e7eb",
                    }}
                    presetColors={[
                      "#D0021B",
                      "#F5A623",
                      "#F8E71C",
                      "#8B572A",
                      "#7ED321",
                      "#417505",
                      "#BD10E0",
                      "#9013FE",
                      "#4A90E2",
                      "#50E3C2",
                      "#B8E986",
                      "#000000",
                      "#4A4A4A",
                      "#9B9B9B",
                      "#FFFFFF",
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Harmonies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.colorPicker.colorHarmonies")}
              </CardTitle>
              <CardDescription>
                {t("tools.colorPicker.colorHarmoniesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generateHarmonies().map((harmony, idx) => (
                  <div key={idx} className="space-y-2">
                    <span className="text-sm font-medium">{harmony.name}</span>
                    <div className="flex gap-2">
                      {harmony.colors.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="group relative flex-1 h-16 rounded-md border-2 border-border hover:border-primary transition-colors cursor-pointer overflow-hidden"
                          style={{ backgroundColor: c }}
                          onClick={() => handleColorChange(c)}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute bottom-1 right-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyWithAnimation(c);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="absolute bottom-1 left-1 text-xs font-mono bg-background/80 px-1.5 py-0.5 rounded">
                            {c}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Formats */}
          {formats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.colorPicker.formats")}
                </CardTitle>
                <CardDescription>
                  {t("tools.colorPicker.formatsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(formats).map(([name, value]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium uppercase shrink-0 w-16">
                          {name}
                        </span>
                        <code className="text-sm font-mono text-muted-foreground truncate">
                          {value}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyWithAnimation(value)}
                        className={cn("shrink-0", copyAnimationClass)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent
          value="palette"
          className="flex-1 flex flex-col gap-4 mt-4"
        >
          {/* Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.colorPicker.generatePalette")}
              </CardTitle>
              <CardDescription>
                {t("tools.colorPicker.generatePaletteDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 transition-colors border-border hover:border-primary/50",
                  isProcessing && "opacity-50 pointer-events-none",
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="p-3 rounded-full bg-primary/20">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("tools.colorPicker.processing")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("tools.colorPicker.extractingColors")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="p-3 rounded-full bg-muted">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("tools.colorPicker.dragDropImage")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("tools.colorPicker.orClickToUpload")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("tools.colorPicker.selectImage")}
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </CardContent>
          </Card>

          {/* Generated Palette */}
          {palette.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.colorPicker.extractedColors")}
                </CardTitle>
                <CardDescription>
                  {t("tools.colorPicker.extractedColorsDescription", {
                    count: palette.length,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {palette.map((c, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-md border-2 border-border hover:border-primary transition-colors cursor-pointer overflow-hidden"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        handleColorChange(c);
                        setActiveTab("picker");
                      }}
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWithAnimation(c);
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <span className="absolute bottom-1 left-1 right-1 text-xs font-mono bg-background/90 px-1.5 py-0.5 rounded text-center">
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
