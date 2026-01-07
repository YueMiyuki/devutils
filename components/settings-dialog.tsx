"use client";

import { useState, useEffect } from "react";
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
import { Monitor, Moon, Sun } from "lucide-react";

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
  { value: "en", label: "English" },
  { value: "zh", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle language code properly for zh-TW
  const currentLang =
    i18n.language === "zh-TW" ? "zh-TW" : i18n.language.split("-")[0];

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("settings.language")}
            </Label>
            <RadioGroup
              value={currentLang}
              onValueChange={handleLanguageChange}
              className="grid grid-cols-3 gap-2"
            >
              {languages.map((lang) => (
                <Label
                  key={lang.value}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                    currentLang === lang.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <RadioGroupItem value={lang.value} className="sr-only" />
                  <span className="text-xs font-medium">
                    {getLanguageLabel(lang.value)}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.theme")}</Label>
            {mounted ? (
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="grid grid-cols-3 gap-2"
              >
                {themes.map((themeOption) => (
                  <Label
                    key={themeOption.value}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                      theme === themeOption.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <RadioGroupItem
                      value={themeOption.value}
                      className="sr-only"
                    />
                    <themeOption.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">
                      {getThemeLabel(themeOption.value)}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {themes.map((themeOption) => (
                  <div
                    key={themeOption.value}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-border animate-pulse"
                  >
                    <themeOption.icon className="w-5 h-5 opacity-50" />
                    <span className="text-xs font-medium opacity-50">
                      {getThemeLabel(themeOption.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
