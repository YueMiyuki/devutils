"use client";

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
import { Monitor, Moon, Sun, Languages } from "lucide-react";

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
  { value: "cn", label: "中文" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getLanguageLabel = (value: string) => {
    return value === "en" ? t("settings.english") : t("settings.chinese");
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
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              <Label className="text-sm font-medium">
                {t("settings.language")}
              </Label>
            </div>
            <RadioGroup
              value={i18n.language}
              onValueChange={handleLanguageChange}
              className="grid grid-cols-2 gap-2"
            >
              {languages.map((lang) => (
                <Label
                  key={lang.value}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                    i18n.language === lang.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <RadioGroupItem value={lang.value} className="sr-only" />
                  <span className="text-sm font-medium">
                    {getLanguageLabel(lang.value)}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.theme")}</Label>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
