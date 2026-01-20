"use client";

import React from "react";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTabStore } from "@/lib/tab-store";
import {
  FUN_TOOLS,
  TOOL_ICONS,
  TOOL_TRANSLATIONS,
  ToolId,
  UTILITY_TOOLS,
} from "@/lib/tools-meta";
import {
  Command,
  Search,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: ToolId;
  name: string;
  category: string;
}

export function CommandPalette() {
  const { t } = useTranslation();
  const { openOrFocusTab } = useTabStore();
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toolItems: PaletteItem[] = useMemo(() => {
    const tools = [...UTILITY_TOOLS, ...FUN_TOOLS];
    return tools.map((id) => ({
      id,
      name: t(TOOL_TRANSLATIONS[id]) || id,
      category: FUN_TOOLS.includes(id)
        ? t("tabBar.funStuff")
        : t("tabBar.utilities"),
    }));
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toolItems;
    return toolItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.replace(/-/g, " ").includes(q),
    );
  }, [query, toolItems]);

  const clampedSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, filtered.length - 1),
  );

  useEffect(() => {
    itemRefs.current[clampedSelectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [clampedSelectedIndex]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      setQuery("");
    }, 300);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          setOpen(true);
        }
      } else if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      const label = item.name || item.id;
      openOrFocusTab(item.id, label);
      handleClose();
    },
    [openOrFocusTab, handleClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[clampedSelectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[clampedSelectedIndex]);
      }
    },
    [filtered, clampedSelectedIndex, handleSelect],
  );

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center",
        isClosing
          ? "animate-palette-backdrop-out"
          : `
          animate-palette-backdrop-in
        `,
      )}
      onClick={handleClose}
      data-ignore-click-saver
    >
      {/* Animated scan lines effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
              absolute inset-0 bg-linear-to-b from-transparent via-foreground/2
              to-transparent
            `,
            "h-[200%] -translate-y-1/2",
            !isClosing && "animate-scan-lines",
          )}
        />
      </div>

      {/* Animated grid pattern */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isClosing ? "animate-grid-out" : "animate-grid-in",
        )}
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--foreground) / 0.03) 1px, transparent 1px),
                           linear-gradient(to bottom, hsl(var(--foreground) / 0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow from center */}
      <div
        className={cn(
          "absolute top-[20vh] left-1/2 h-[400px] w-[800px] -translate-x-1/2",
          "bg-gradient-radial from-foreground/5 via-foreground/2 to-transparent",
          "pointer-events-none rounded-full blur-3xl",
          isClosing ? "animate-glow-out" : "animate-glow-in",
        )}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute size-1 rounded-full bg-foreground/20",
              !isClosing && "animate-float-particle",
            )}
            style={{
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 100}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + (i % 5) * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Main container */}
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative mx-4 mt-[15vh] w-full max-w-2xl",
          isClosing ? "animate-palette-out" : "animate-palette-in",
        )}
      >
        {/* Outer glow ring */}
        <div
          className="
          pointer-events-none absolute -inset-4 rounded-3xl bg-linear-to-b
          from-foreground/10 via-transparent to-foreground/5 blur-2xl
        "
        />

        {/* Animated border */}
        <div className="absolute -inset-px overflow-hidden rounded-2xl">
          <div
            className={cn(
              "absolute inset-0",
              `
                bg-gradient-conic from-foreground/20 via-transparent via-30%
                to-foreground/20
              `,
              !isClosing && "animate-border-spin",
            )}
          />
        </div>

        {/* Content container */}
        <div
          className="
          relative overflow-hidden rounded-2xl border border-border/50
          bg-background/95 shadow-2xl backdrop-blur-2xl
        "
        >
          {/* Header with search */}
          <div className="relative border-b border-border/50">
            {/* Header glow line */}
            <div
              className="
              absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
              via-foreground/20 to-transparent
            "
            />

            <div className="flex items-center gap-4 px-5 py-4">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  "border border-foreground/10 bg-foreground/5",
                  "transition-all duration-300",
                  !isClosing && "animate-icon-pulse",
                )}
              >
                <Command className="size-5 text-foreground/70" />
              </div>

              <div className="group relative flex-1">
                <Search
                  className="
                  absolute top-1/2 left-4 size-4 -translate-y-1/2
                  text-muted-foreground transition-colors
                  group-focus-within:text-foreground/70
                "
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder={t("commandPalette.placeholder")}
                  className={cn(
                    "h-12 w-full rounded-xl pr-4 pl-11",
                    "border border-foreground/10 bg-foreground/3",
                    `
                      text-foreground
                      placeholder:text-muted-foreground/60
                    `,
                    `
                      focus:border-foreground/20 focus:bg-foreground/5
                      focus:outline-none
                    `,
                    "transition-all duration-300",
                  )}
                />
                {/* Input focus glow */}
                <div
                  className="
                  pointer-events-none absolute inset-0 rounded-xl
                  bg-foreground/5 opacity-0 blur-xl transition-opacity
                  duration-300
                  group-focus-within:opacity-100
                "
                />
              </div>

              {/* Keyboard hint */}
              <div
                className="
                hidden items-center gap-1.5 text-xs text-muted-foreground
                sm:flex
              "
              >
                <kbd
                  className="
                  rounded-md border border-foreground/10 bg-foreground/5 px-2
                  py-1 font-mono text-[11px]
                "
                >
                  esc
                </kbd>
                <span>to close</span>
              </div>
            </div>
          </div>

          {/* Results list */}
          <div className="scrollbar-thin max-h-[400px] overflow-y-auto">
            <div className="p-3">
              {filtered.length === 0 ? (
                <div
                  className={cn(
                    `
                      flex flex-col items-center justify-center py-16
                      text-muted-foreground
                    `,
                    !isClosing && "animate-fade-in-up",
                  )}
                >
                  <div
                    className="
                    mb-4 flex size-16 items-center justify-center rounded-2xl
                    border border-foreground/10 bg-foreground/5
                  "
                  >
                    <Search className="size-7 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">
                    {t("commandPalette.empty")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((item, index) => {
                    const Icon = TOOL_ICONS[item.id] || Command;
                    const isSelected = index === clampedSelectedIndex;
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          `
                            group flex w-full items-center gap-4 rounded-xl px-4
                            py-3
                          `,
                          "text-left transition-all duration-200",
                          "hover:bg-foreground/3",
                          isSelected &&
                            "bg-foreground/5 shadow-lg shadow-foreground/5",
                          !isClosing && "animate-item-in",
                        )}
                        style={{
                          animationDelay: `${50 + index * 30}ms`,
                        }}
                      >
                        <div
                          className={cn(
                            `
                              relative flex size-10 items-center justify-center
                              rounded-xl
                            `,
                            "transition-all duration-300",
                            isSelected
                              ? `
                                border border-foreground/20 bg-foreground/10
                                shadow-lg
                              `
                              : `border border-foreground/5 bg-foreground/3`,
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5 transition-all duration-300",
                              isSelected
                                ? "text-foreground"
                                : "text-foreground/50",
                            )}
                          />
                          {isSelected && (
                            <div
                              className="
                              absolute inset-0 animate-pulse rounded-xl
                              bg-foreground/10 blur-lg
                            "
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              `
                                truncate text-sm font-medium transition-colors
                                duration-200
                              `,
                              isSelected
                                ? "text-foreground"
                                : "text-foreground/70",
                            )}
                          >
                            {item.name}
                          </p>
                          <p
                            className="
                            truncate text-xs text-muted-foreground/60
                          "
                          >
                            {item.category}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        <div
                          className={cn(
                            `
                              flex items-center gap-2 transition-all
                              duration-200
                            `,
                            isSelected
                              ? "translate-x-0 opacity-100"
                              : "translate-x-2 opacity-0",
                          )}
                        >
                          <Sparkles className="size-3 text-foreground/40" />
                          <kbd
                            className="
                            rounded-md border border-foreground/10
                            bg-foreground/5 px-2 py-1 font-mono text-[10px]
                            text-foreground/60
                          "
                          >
                            <CornerDownLeft className="size-3" />
                          </kbd>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="relative border-t border-border/50 bg-foreground/2">
            {/* Footer glow line */}
            <div
              className="
              absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
              via-foreground/10 to-transparent
            "
            />

            <div className="flex items-center justify-between px-5 py-3">
              <div
                className="
                flex items-center gap-4 text-xs text-muted-foreground/60
              "
              >
                <div className="flex items-center gap-1.5">
                  <kbd
                    className="
                    flex size-6 items-center justify-center rounded-md border
                    border-foreground/10 bg-foreground/5 font-mono text-[10px]
                  "
                  >
                    <ArrowUp className="size-3" />
                  </kbd>
                  <kbd
                    className="
                    flex size-6 items-center justify-center rounded-md border
                    border-foreground/10 bg-foreground/5 font-mono text-[10px]
                  "
                  >
                    <ArrowDown className="size-3" />
                  </kbd>
                  <span
                    className="
                    ml-1 hidden
                    sm:inline
                  "
                  >
                    Navigate
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd
                    className="
                    flex size-6 items-center justify-center rounded-md border
                    border-foreground/10 bg-foreground/5 font-mono text-[10px]
                  "
                  >
                    <CornerDownLeft className="size-3" />
                  </kbd>
                  <span
                    className="
                    hidden
                    sm:inline
                  "
                  >
                    Select
                  </span>
                </div>
              </div>

              <div
                className="
                flex items-center gap-2 text-xs text-muted-foreground/60
              "
              >
                <span className="tabular-nums">{filtered.length}</span>
                <span>{filtered.length === 1 ? "result" : "results"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
