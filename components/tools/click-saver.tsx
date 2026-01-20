"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Gauge,
  Medal,
  Mountain,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";
import {
  resetSessionClicks,
  setClickPersist,
  subscribeClickTracker,
} from "@/lib/click-tracker";

interface ClickSaverProps {
  tabId: string;
}

const DISTANCE_PER_CLICK_METERS = 0.2;
const SECONDS_PER_CLICK = 0.6;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ClickSaver({ tabId: _tabId }: ClickSaverProps) {
  const { t } = useTranslation();
  const [sessionClicks, setSessionClicks] = useState(0);
  const [lifetimeClicks, setLifetimeClicks] = useState(0);
  const [persist, setPersist] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeClickTracker((state) => {
      setSessionClicks(state.session);
      setLifetimeClicks(state.lifetime);
      setPersist(state.persist);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const distanceMeters = lifetimeClicks * DISTANCE_PER_CLICK_METERS;
  const distanceKm = distanceMeters / 1000;
  const distanceMiles = distanceMeters / 1609.344;
  const timeSavedMinutes = (lifetimeClicks * SECONDS_PER_CLICK) / 60;

  const badges = useMemo(
    () => [
      {
        id: "starter",
        threshold: 50,
        label: t("tools.clickSaver.badges.starter"),
        icon: Sparkles,
      },
      {
        id: "apprentice",
        threshold: 500,
        label: t("tools.clickSaver.badges.apprentice"),
        icon: Medal,
      },
      {
        id: "marathon",
        threshold: 5000,
        label: t("tools.clickSaver.badges.marathon"),
        icon: Trophy,
      },
      {
        id: "everest",
        threshold: 100000,
        label: t("tools.clickSaver.badges.everest"),
        icon: Mountain,
      },
    ],
    [t],
  );

  const earnedBadges = badges.filter(
    (badge) => lifetimeClicks >= badge.threshold,
  );
  const nextBadge = badges.find((badge) => lifetimeClicks < badge.threshold);
  const nextBadgeProgress =
    nextBadge && nextBadge.threshold > 0
      ? Math.min((lifetimeClicks / nextBadge.threshold) * 100, 100)
      : 100;

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <div
          className="
          flex size-10 items-center justify-center rounded-lg bg-primary/10
          text-primary
        "
        >
          <MousePointerClick className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {t("tools.clickSaver.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tools.clickSaver.subtitle")}
          </p>
        </div>
      </div>

      <div
        className="
        grid gap-4
        lg:grid-cols-3
      "
      >
        <Card className="lg:col-span-2">
          <CardHeader
            className="
            flex flex-row items-center justify-between space-y-0
          "
          >
            <div>
              <CardTitle className="text-base">
                {t("tools.clickSaver.stats.total")}
              </CardTitle>
              <CardDescription>
                {t("tools.clickSaver.stats.mouseMiles")}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Gauge className="size-3" />
              {t("tools.clickSaver.badges.earned", {
                count: earnedBadges.length,
              })}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="
              grid gap-3
              md:grid-cols-3
            "
            >
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.lifetime")}
                </p>
                <p className="text-2xl font-semibold">
                  {lifetimeClicks.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.session", {
                    count: sessionClicks,
                  })}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.distanceLabel")}
                </p>
                <p className="text-2xl font-semibold">
                  {distanceMiles.toFixed(2)} mi
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ {distanceKm.toFixed(2)} km
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.timeSaved")}
                </p>
                <p className="text-2xl font-semibold">
                  {timeSavedMinutes.toFixed(1)}m
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.perClick", {
                    seconds: SECONDS_PER_CLICK,
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div
                className="
                flex items-center justify-between text-xs text-muted-foreground
              "
              >
                <span>
                  {nextBadge
                    ? t("tools.clickSaver.badges.next", {
                        badge: nextBadge.label,
                        remaining: Math.max(
                          nextBadge.threshold - lifetimeClicks,
                          0,
                        ).toLocaleString(),
                      })
                    : t("tools.clickSaver.badges.allEarned")}
                </span>
                <span className="font-medium text-foreground">
                  {Math.round(nextBadgeProgress)}%
                </span>
              </div>
              <Progress value={nextBadgeProgress} />
            </div>
          </CardContent>
        </Card>

        <Card data-ignore-click-saver>
          <CardHeader>
            <CardTitle className="text-base">
              {t("tools.clickSaver.inputs.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.clickSaver.inputs.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {t("tools.clickSaver.inputs.persist")}
                </span>
                <Switch
                  checked={persist}
                  onCheckedChange={(checked) => setClickPersist(checked)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("tools.clickSaver.messages.persistNote")}
              </p>
              <Button
                variant="outline"
                onClick={() => resetSessionClicks()}
                className="flex w-full items-center justify-center gap-2"
              >
                <RefreshCw className="size-4" />
                {t("tools.clickSaver.actions.resetSession")}
              </Button>
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-primary" />
                  {t("tools.clickSaver.metersPerClick", {
                    meters: DISTANCE_PER_CLICK_METERS,
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("tools.clickSaver.stats.distanceHint")}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Timer className="size-4 text-primary" />
                  {t("tools.clickSaver.actions.timeHint", {
                    seconds: SECONDS_PER_CLICK,
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("tools.clickSaver.actions.timeHintDetail")}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MousePointerClick className="size-4 text-primary" />
                  {t("tools.clickSaver.actions.sessionTotal", {
                    count: sessionClicks,
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("tools.clickSaver.actions.sessionDetail")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card data-ignore-click-saver>
          <CardHeader>
            <CardTitle className="text-base">
              {t("tools.clickSaver.badges.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.clickSaver.badges.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {badges.map((badge) => {
              const earned = lifetimeClicks >= badge.threshold;
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`
                      flex size-10 items-center justify-center rounded-full
                      ${earned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
                    `}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{badge.label}</p>
                      {earned ? (
                        <Badge variant="secondary">
                          {t("tools.clickSaver.badges.earnedLabel")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t("tools.clickSaver.badges.goal", {
                            count: badge.threshold,
                          })}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("tools.clickSaver.badges.description", {
                        distance: (
                          (badge.threshold * DISTANCE_PER_CLICK_METERS) /
                          1000
                        ).toFixed(1),
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
