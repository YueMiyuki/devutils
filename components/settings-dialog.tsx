"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun, Settings, Globe, Palette } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const languages = [
  { value: "en", label: "English", flag: "EN" },
  { value: "zh", label: "简体中文", flag: "CN" },
  { value: "zh-TW", label: "繁體中文", flag: "TW" },
];

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Handle language code properly for zh-TW
  const currentLang =
    i18n.language === "zh-TW" ? "zh-TW" : i18n.language?.split("-")[0] || "en";

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getLanguageLabel = (value: string) => {
    const labels: Record<string, string> = {
      en: t("settings.english"),
      zh: t("settings.simplifiedChinese"),
      "zh-TW": t("settings.traditionalChinese"),
    };
    return labels[value] || value;
  };

  const getThemeLabel = (value: string) => {
    return t(`settings.${value}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          `
            gap-0 overflow-hidden p-0
            sm:max-w-lg
          `,
          "border-foreground/10 bg-background/95 backdrop-blur-2xl",
          "shadow-2xl shadow-foreground/5",
        )}
      >
        {/* Header */}
        <DialogHeader className="relative border-b border-foreground/5 p-6 pb-4">
          <div
            className="
            absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent
            via-foreground/10 to-transparent
          "
          />
          <div className="flex items-center gap-3">
            <div
              className="
              flex size-10 items-center justify-center rounded-xl border
              border-foreground/10 bg-foreground/5
            "
            >
              <Settings className="size-5 text-foreground/60" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t("settings.title")}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Customize your experience
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 p-6">
          {/* Language Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground/60" />
              <Label className="text-sm font-medium text-foreground/80">
                {t("settings.language")}
              </Label>
            </div>
            <RadioGroup
              value={currentLang}
              onValueChange={handleLanguageChange}
              className="grid grid-cols-3 gap-3"
            >
              {languages.map((lang, index) => (
                <Label
                  key={lang.value}
                  className={cn(
                    `
                      relative flex cursor-pointer flex-col items-center gap-2
                      rounded-xl p-4
                    `,
                    "transition-all duration-200",
                    "animate-item-in",
                    currentLang === lang.value
                      ? `
                        border-2 border-foreground/20 bg-foreground/8 shadow-lg
                        shadow-foreground/5
                      `
                      : `
                        border-2 border-transparent bg-foreground/2
                        hover:border-foreground/10 hover:bg-foreground/5
                      `,
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <RadioGroupItem value={lang.value} className="sr-only" />
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-xs",
                      "transition-colors duration-200",
                      currentLang === lang.value
                        ? "bg-foreground/10 text-foreground"
                        : "bg-foreground/3 text-muted-foreground/60",
                    )}
                  >
                    {lang.flag}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-200",
                      currentLang === lang.value
                        ? "text-foreground"
                        : "text-foreground/60",
                    )}
                  >
                    {getLanguageLabel(lang.value)}
                  </span>
                  {currentLang === lang.value && (
                    <div
                      className="
                      pointer-events-none absolute inset-0 rounded-xl
                      bg-foreground/5 blur-lg
                    "
                    />
                  )}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Theme Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground/60" />
              <Label className="text-sm font-medium text-foreground/80">
                {t("settings.theme")}
              </Label>
            </div>
            {mounted ? (
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="grid grid-cols-3 gap-3"
              >
                {themes.map((themeOption, index) => (
                  <Label
                    key={themeOption.value}
                    className={cn(
                      `
                        relative flex cursor-pointer flex-col items-center gap-3
                        rounded-xl p-4
                      `,
                      "transition-all duration-200",
                      "animate-item-in",
                      theme === themeOption.value
                        ? `
                          border-2 border-foreground/20 bg-foreground/8
                          shadow-lg shadow-foreground/5
                        `
                        : `
                          border-2 border-transparent bg-foreground/2
                          hover:border-foreground/10 hover:bg-foreground/5
                        `,
                    )}
                    style={{ animationDelay: `${(index + 3) * 50}ms` }}
                  >
                    <RadioGroupItem
                      value={themeOption.value}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        "transition-all duration-200",
                        theme === themeOption.value
                          ? "bg-foreground/10 text-foreground"
                          : "bg-foreground/3 text-muted-foreground/50",
                      )}
                    >
                      <themeOption.icon
                        className={cn(
                          "size-5 transition-transform duration-200",
                          theme === themeOption.value && "scale-110",
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors duration-200",
                        theme === themeOption.value
                          ? "text-foreground"
                          : "text-foreground/60",
                      )}
                    >
                      {getThemeLabel(themeOption.value)}
                    </span>
                    {theme === themeOption.value && (
                      <div
                        className="
                        pointer-events-none absolute inset-0 rounded-xl
                        bg-foreground/5 blur-lg
                      "
                      />
                    )}
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {themes.map((themeOption) => (
                  <div
                    key={themeOption.value}
                    className="
                      flex flex-col items-center gap-3 rounded-xl border-2
                      border-transparent bg-foreground/2 p-4
                    "
                  >
                    <div
                      className="
                      flex size-10 items-center justify-center rounded-xl
                      bg-foreground/3
                    "
                    >
                      <themeOption.icon
                        className="
                        size-5 animate-pulse text-muted-foreground/30
                      "
                      />
                    </div>
                    <span
                      className="
                      text-xs font-medium text-muted-foreground/30
                    "
                    >
                      {getThemeLabel(themeOption.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div
          className="
          relative border-t border-foreground/5 bg-foreground/1 px-6 py-4
        "
        >
          <div
            className="
            absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
            via-foreground/5 to-transparent
          "
          />
          <p className="text-center text-xs text-muted-foreground/40">
            Press{" "}
            <kbd
              className="
              mx-1 rounded-sm border border-foreground/10 bg-foreground/5 px-1.5
              py-0.5 font-mono text-[10px]
            "
            >
              Esc
            </kbd>{" "}
            to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
