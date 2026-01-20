"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Clock, Calendar } from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface CronGeneratorProps {
  tabId: string;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CronGenerator({ tabId: _tabId }: CronGeneratorProps) {
  const { t } = useTranslation();
  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const [frequency, setFrequency] = useState<string>("daily");
  const [hour, setHour] = useState<string>("0");
  const [minute, setMinute] = useState<string>("0");
  const [dayOfWeek, setDayOfWeek] = useState<string>("1");
  const [dayOfMonth, setDayOfMonth] = useState<string>("1");
  const [month, setMonth] = useState<string>("1");
  const [customInterval, setCustomInterval] = useState<string>("1");

  const generateCronExpression = useCallback(() => {
    let cron = "";

    switch (frequency) {
      case "every-minute":
        cron = "* * * * *";
        break;
      case "every-n-minutes":
        cron = `*/${customInterval} * * * *`;
        break;
      case "hourly":
        cron = `${minute} * * * *`;
        break;
      case "every-n-hours":
        cron = `${minute} */${customInterval} * * *`;
        break;
      case "daily":
        cron = `${minute} ${hour} * * *`;
        break;
      case "weekly":
        cron = `${minute} ${hour} * * ${dayOfWeek}`;
        break;
      case "monthly":
        cron = `${minute} ${hour} ${dayOfMonth} * *`;
        break;
      case "yearly":
        cron = `${minute} ${hour} ${dayOfMonth} ${month} *`;
        break;
      case "weekdays":
        cron = `${minute} ${hour} * * 1-5`;
        break;
      case "weekends":
        cron = `${minute} ${hour} * * 0,6`;
        break;
      default:
        cron = "0 0 * * *";
    }

    return cron;
  }, [frequency, hour, minute, dayOfWeek, dayOfMonth, month, customInterval]);

  const generateDescription = useCallback((cron: string) => {
    const parts = cron.split(" ");
    if (parts.length !== 5) return "Invalid cron expression";

    const [min, hr, dom, mon, dow] = parts;
    const desc: string[] = [];

    if (
      min === "*" &&
      hr === "*" &&
      dom === "*" &&
      mon === "*" &&
      dow === "*"
    ) {
      return "Every minute";
    }

    if (min.startsWith("*/")) {
      desc.push(`Every ${min.slice(2)} minutes`);
    } else if (min === "*") {
      desc.push("Every minute");
    }

    if (hr.startsWith("*/")) {
      desc.push(`every ${hr.slice(2)} hours`);
    } else if (hr !== "*") {
      const hourNum = parseInt(hr);
      const period = hourNum >= 12 ? "PM" : "AM";
      const displayHour =
        hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      const displayMin = min === "*" ? "00" : min.padStart(2, "0");
      desc.push(`at ${displayHour}:${displayMin} ${period}`);
    }

    // Day of month
    if (dom !== "*") {
      desc.push(`on day ${dom} of the month`);
    }

    // Month
    if (mon !== "*") {
      const monthNum = parseInt(mon) - 1;
      desc.push(`in ${MONTHS[monthNum]}`);
    }

    // Day of week
    if (dow !== "*") {
      if (dow === "1-5") {
        desc.push("on weekdays");
      } else if (dow === "0,6") {
        desc.push("on weekends");
      } else if (dow.includes(",")) {
        const days = dow.split(",").map((d) => WEEKDAYS[parseInt(d)]);
        desc.push(`on ${days.join(", ")}`);
      } else {
        const dayNum = parseInt(dow);
        desc.push(`on ${WEEKDAYS[dayNum]}`);
      }
    } else if (dom === "*" && mon === "*") {
      desc.push("every day");
    }

    const result = desc.join(", ");
    return result.charAt(0).toUpperCase() + result.slice(1);
  }, []);

  const calculateNextRuns = useCallback((cron: string, freq: string) => {
    const parts = cron.split(" ");
    if (parts.length !== 5) return [];

    const [minPart, hrPart, domPart, monPart, dowPart] = parts;
    const now = new Date();
    const runs: string[] = [];

    for (let i = 0; i < 5; i++) {
      const next = new Date(now);

      switch (freq) {
        case "every-minute":
          next.setMinutes(now.getMinutes() + (i + 1));
          break;

        case "every-n-minutes": {
          const interval = parseInt(minPart.slice(2));
          next.setMinutes(now.getMinutes() + interval * (i + 1));
          break;
        }

        case "hourly":
          next.setHours(now.getHours() + (i + 1));
          next.setMinutes(parseInt(minPart));
          break;

        case "every-n-hours": {
          const interval = parseInt(hrPart.slice(2));
          next.setHours(now.getHours() + interval * (i + 1));
          next.setMinutes(parseInt(minPart));
          break;
        }

        case "daily": {
          const targetHr = parseInt(hrPart);
          const targetMin = parseInt(minPart);
          next.setDate(now.getDate() + (i + 1));
          next.setHours(targetHr);
          next.setMinutes(targetMin);
          next.setSeconds(0);
          break;
        }

        case "weekdays":
        case "weekends": {
          const targetHr = parseInt(hrPart);
          const targetMin = parseInt(minPart);
          const isWeekdays = freq === "weekdays";

          let daysAdded = 0;
          let matchingDaysFound = 0;

          while (matchingDaysFound < i + 1) {
            daysAdded++;
            const candidate = new Date(now);
            candidate.setDate(now.getDate() + daysAdded);
            const dayOfWeek = candidate.getDay();

            const isMatch = isWeekdays
              ? dayOfWeek >= 1 && dayOfWeek <= 5 // Mon-Fri
              : dayOfWeek === 0 || dayOfWeek === 6; // Sat-Sun

            if (isMatch) {
              matchingDaysFound++;
            }
          }

          next.setDate(now.getDate() + daysAdded);
          next.setHours(targetHr);
          next.setMinutes(targetMin);
          next.setSeconds(0);
          break;
        }

        case "weekly": {
          const targetHr = parseInt(hrPart);
          const targetMin = parseInt(minPart);
          const targetDow = parseInt(dowPart);

          const currentDow = now.getDay();
          let daysToAdd = (targetDow - currentDow + 7) % 7;

          if (daysToAdd === 0) {
            const targetTime = new Date(now);
            targetTime.setHours(targetHr, targetMin, 0, 0);
            if (now > targetTime) {
              daysToAdd = 7; // Next week
            }
          }

          daysToAdd += 7 * i;

          next.setDate(now.getDate() + daysToAdd);
          next.setHours(targetHr);
          next.setMinutes(targetMin);
          next.setSeconds(0);
          break;
        }

        case "monthly": {
          const targetHr = parseInt(hrPart);
          const targetMin = parseInt(minPart);
          const targetDom = parseInt(domPart);
          next.setMonth(now.getMonth() + (i + 1));
          next.setDate(targetDom);
          next.setHours(targetHr);
          next.setMinutes(targetMin);
          next.setSeconds(0);
          break;
        }

        case "yearly": {
          const targetHr = parseInt(hrPart);
          const targetMin = parseInt(minPart);
          const targetDom = parseInt(domPart);
          const targetMon = parseInt(monPart) - 1;
          next.setFullYear(now.getFullYear() + (i + 1));
          next.setMonth(targetMon);
          next.setDate(targetDom);
          next.setHours(targetHr);
          next.setMinutes(targetMin);
          next.setSeconds(0);
          break;
        }

        default:
          next.setDate(now.getDate() + (i + 1));
      }

      runs.push(next.toLocaleString());
    }

    return runs;
  }, []);

  const cronExpression = useMemo(() => {
    return generateCronExpression();
  }, [generateCronExpression]);

  const description = useMemo(() => {
    return generateDescription(cronExpression);
  }, [cronExpression, generateDescription]);

  const nextRuns = useMemo(() => {
    return calculateNextRuns(cronExpression, frequency);
  }, [cronExpression, frequency, calculateNextRuns]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Builder Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4" />
            <CardTitle className="text-base">
              {t("tools.cronGenerator.builder")}
            </CardTitle>
          </div>
          <CardDescription>
            {t("tools.cronGenerator.builderDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frequency Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("tools.cronGenerator.frequency")}
            </label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="every-minute">Every minute</SelectItem>
                <SelectItem value="every-n-minutes">Every N minutes</SelectItem>
                <SelectItem value="hourly">Every hour</SelectItem>
                <SelectItem value="every-n-hours">Every N hours</SelectItem>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly">Every week</SelectItem>
                <SelectItem value="monthly">Every month</SelectItem>
                <SelectItem value="yearly">Every year</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                <SelectItem value="weekends">Weekends (Sat-Sun)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Interval */}
          {(frequency === "every-n-minutes" ||
            frequency === "every-n-hours") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("tools.cronGenerator.interval")}
              </label>
              <Input
                type="number"
                min="1"
                max={frequency === "every-n-minutes" ? "59" : "23"}
                value={customInterval}
                onChange={(e) => setCustomInterval(e.target.value)}
              />
            </div>
          )}

          {/* Time Selectors */}
          {!["every-minute", "every-n-minutes"].includes(frequency) && (
            <div className="grid grid-cols-2 gap-4">
              {/* Hour Selector */}
              {!["hourly", "every-n-hours"].includes(frequency) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("tools.cronGenerator.hour")}
                  </label>
                  <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hr = i;
                        const period = hr >= 12 ? "PM" : "AM";
                        const displayHr =
                          hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {displayHr.toString().padStart(2, "0")}:00 {period}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Minute Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("tools.cronGenerator.minute")}
                </label>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Day of Week Selector */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("tools.cronGenerator.dayOfWeek")}
              </label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month and Month Selectors */}
          {(frequency === "monthly" || frequency === "yearly") && (
            <div className="grid grid-cols-2 gap-4">
              {/* Day of Month Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("tools.cronGenerator.dayOfMonth")}
                </label>
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Selector */}
              {frequency === "yearly" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("tools.cronGenerator.month")}
                  </label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((mon, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {mon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {t("tools.cronGenerator.expression")}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyWithAnimation(cronExpression)}
              className={copyAnimationClass}
            >
              <Copy className="mr-2 size-4" />
              {t("tools.cronGenerator.copy")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="
            rounded-md bg-muted/50 p-4 text-center font-mono text-lg
          "
          >
            {cronExpression}
          </div>

          {/* Cron format guide */}
          <div className="space-y-2 rounded-md bg-muted/30 p-3 text-sm">
            <div className="font-medium">{t("tools.cronGenerator.format")}</div>
            <code className="block font-mono text-xs">
              * * * * *
              <br />│ │ │ │ │
              <br />│ │ │ │ └─ {t("tools.cronGenerator.formatDayOfWeek")} (0-6)
              <br />│ │ │ └─── {t("tools.cronGenerator.formatMonth")} (1-12)
              <br />│ │ └───── {t("tools.cronGenerator.formatDay")} (1-31)
              <br />│ └─────── {t("tools.cronGenerator.formatHour")} (0-23)
              <br />
              └───────── {t("tools.cronGenerator.formatMinute")} (0-59)
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Next Runs Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="size-4" />
            <CardTitle className="text-base">
              {t("tools.cronGenerator.nextRuns")}
            </CardTitle>
          </div>
          <CardDescription>
            {t("tools.cronGenerator.nextRunsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nextRuns.map((run, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
              >
                <Badge variant="outline" className="shrink-0">
                  {i + 1}
                </Badge>
                <span className="font-mono text-sm">{run}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("tools.cronGenerator.presets")}
          </CardTitle>
          <CardDescription>
            {t("tools.cronGenerator.presetsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="
            grid grid-cols-2 gap-2
            md:grid-cols-3
          "
          >
            {[
              { label: "Every minute", freq: "every-minute" },
              { label: "Every hour", freq: "hourly" },
              { label: "Daily at midnight", freq: "daily", h: "0", m: "0" },
              { label: "Daily at noon", freq: "daily", h: "12", m: "0" },
              { label: "Weekdays at 9 AM", freq: "weekdays", h: "9", m: "0" },
              {
                label: "Weekly on Monday",
                freq: "weekly",
                h: "0",
                m: "0",
                dow: "1",
              },
            ].map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-auto px-3 py-2 text-xs"
                onClick={() => {
                  setFrequency(preset.freq);
                  if (preset.h) setHour(preset.h);
                  if (preset.m) setMinute(preset.m);
                  if (preset.dow) setDayOfWeek(preset.dow);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
