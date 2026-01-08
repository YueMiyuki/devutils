"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Copy, Trash2, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";

interface TimestampConverterProps {
  tabId: string;
}

interface TimestampFormats {
  unix: string;
  unixMs: string;
  iso8601: string;
  rfc2822: string;
  utc: string;
  local: string;
  relative: string;
  date: string;
  time: string;
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
  dayOfWeek: string;
  dayOfYear: string;
  weekOfYear: string;
  quarter: string;
  sqlDateTime: string;
  sqlDate: string;
  sqlTime: string;
  httpHeader: string;
  atom: string;
  cookie: string;
  rss: string;
  w3c: string;
  excelSerial: string;
  julianDay: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TimestampConverter({ tabId: _tabId }: TimestampConverterProps) {
  const { t } = useTranslation();
  const [timestamp, setTimestamp] = useState<string>(() => {
    const now = new Date();
    return Math.floor(now.getTime() / 1000).toString();
  });
  const [parsedDate, setParsedDate] = useState<Date | null>(() => new Date());

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const parseTimestamp = useCallback((value: string) => {
    if (!value || value.trim() === "") {
      setParsedDate(null);
      return;
    }

    try {
      let date: Date | null = null;

      // Unix timestamp (seconds)
      if (/^\d{10}$/.test(value)) {
        date = new Date(parseInt(value) * 1000);
      }
      // Unix timestamp (milliseconds)
      else if (/^\d{13}$/.test(value)) {
        date = new Date(parseInt(value));
      }
      // ISO 8601 & others
      else {
        const parsed = Date.parse(value);
        if (!isNaN(parsed)) {
          date = new Date(parsed);
        }
      }

      if (date && !isNaN(date.getTime())) {
        setParsedDate(date);
      } else {
        setParsedDate(null);
      }
    } catch {
      setParsedDate(null);
    }
  }, []);

  // Synchronize parsedDate state with timestamp input changes.
  // Alternative would be useMemo, but this approach is clearer for state synchronization.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    parseTimestamp(timestamp);
  }, [timestamp, parseTimestamp]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const getFormats = useCallback((): TimestampFormats | null => {
    if (!parsedDate) return null;

    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const getTimeAgo = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      const diffWeek = Math.floor(diffDay / 7);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffSec < 60) {
        return t("tools.timestampConverter.timeAgo.seconds", {
          count: diffSec,
        });
      } else if (diffMin < 60) {
        return t("tools.timestampConverter.timeAgo.minutes", {
          count: diffMin,
        });
      } else if (diffHour < 24) {
        return t("tools.timestampConverter.timeAgo.hours", { count: diffHour });
      } else if (diffDay < 7) {
        return t("tools.timestampConverter.timeAgo.days", { count: diffDay });
      } else if (diffWeek < 4) {
        return t("tools.timestampConverter.timeAgo.weeks", { count: diffWeek });
      } else if (diffMonth < 12) {
        return t("tools.timestampConverter.timeAgo.months", {
          count: diffMonth,
        });
      } else {
        return t("tools.timestampConverter.timeAgo.years", { count: diffYear });
      }
    };

    const getWeekOfYear = (date: Date): number => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
      );
      return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    };

    const getDayOfYear = (date: Date): number => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor(
        (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
      );
      return days + 1;
    };

    const getQuarter = (date: Date): number => {
      return Math.floor(date.getMonth() / 3) + 1;
    };

    const getExcelSerial = (date: Date): number => {
      const epoch = new Date(1899, 11, 30);
      const days = (date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000);
      return Math.floor(days);
    };

    const getJulianDay = (date: Date): number => {
      const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
      const y = date.getFullYear() + 4800 - a;
      const m = date.getMonth() + 1 + 12 * a - 3;
      return (
        date.getDate() +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
      );
    };

    return {
      unix: Math.floor(parsedDate.getTime() / 1000).toString(),
      unixMs: parsedDate.getTime().toString(),
      iso8601: parsedDate.toISOString(),
      rfc2822: parsedDate.toString(),
      utc: parsedDate.toUTCString(),
      local: parsedDate.toLocaleString(),
      relative: getTimeAgo(parsedDate),
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString(),
      year: parsedDate.getFullYear().toString(),
      month: (parsedDate.getMonth() + 1).toString().padStart(2, "0"),
      day: parsedDate.getDate().toString().padStart(2, "0"),
      hours: parsedDate.getHours().toString().padStart(2, "0"),
      minutes: parsedDate.getMinutes().toString().padStart(2, "0"),
      seconds: parsedDate.getSeconds().toString().padStart(2, "0"),
      dayOfWeek: weekdays[parsedDate.getDay()],
      dayOfYear: getDayOfYear(parsedDate).toString(),
      weekOfYear: getWeekOfYear(parsedDate).toString(),
      quarter: `Q${getQuarter(parsedDate)}`,
      sqlDateTime: `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1).toString().padStart(2, "0")}-${parsedDate.getDate().toString().padStart(2, "0")} ${parsedDate.getHours().toString().padStart(2, "0")}:${parsedDate.getMinutes().toString().padStart(2, "0")}:${parsedDate.getSeconds().toString().padStart(2, "0")}`,
      sqlDate: `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1).toString().padStart(2, "0")}-${parsedDate.getDate().toString().padStart(2, "0")}`,
      sqlTime: `${parsedDate.getHours().toString().padStart(2, "0")}:${parsedDate.getMinutes().toString().padStart(2, "0")}:${parsedDate.getSeconds().toString().padStart(2, "0")}`,
      httpHeader: parsedDate.toUTCString(),
      atom: parsedDate.toISOString(),
      cookie: parsedDate.toUTCString(),
      rss: parsedDate.toUTCString(),
      w3c: parsedDate.toISOString(),
      excelSerial: getExcelSerial(parsedDate).toString(),
      julianDay: getJulianDay(parsedDate).toString(),
    };
  }, [parsedDate, t]);

  const setCurrentTimestamp = () => {
    const now = new Date();
    setTimestamp(Math.floor(now.getTime() / 1000).toString());
  };

  const clearAll = () => {
    setTimestamp("");
    setParsedDate(null);
  };

  const formats = getFormats();

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Timestamp Input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {t("tools.timestampConverter.input")}
              </CardTitle>
              <CardDescription>
                {t("tools.timestampConverter.inputDescription")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setCurrentTimestamp}>
                <Clock className="w-4 h-4 mr-2" />
                {t("tools.timestampConverter.now")}
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t("tools.timestampConverter.clear")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t("tools.timestampConverter.inputPlaceholder")}
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="font-mono"
          />
        </CardContent>
      </Card>

      {/* All Formats */}
      {formats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <CardTitle className="text-base">
                {t("tools.timestampConverter.formats")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("tools.timestampConverter.formatsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(formats).map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {name.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <code className="text-sm font-mono truncate">{value}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyWithAnimation(value)}
                    className={cn("shrink-0 ml-2", copyAnimationClass)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
