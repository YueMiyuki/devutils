"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";

interface RegexTesterProps {
  tabId: string;
}

interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
}

interface CommonPattern {
  name: string;
  pattern: string;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RegexTester({ tabId: _tabId }: RegexTesterProps) {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState("");
  const [testString, setTestString] = useState("");
  const [flags, setFlags] = useState("g");
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  // Flag defs
  const flagDefinitions = [
    {
      flag: "g",
      name: "global",
      description: "Find all matches (not just first)",
    },
    { flag: "i", name: "ignoreCase", description: "Case-insensitive matching" },
    {
      flag: "m",
      name: "multiline",
      description: "^ and $ match line starts/ends",
    },
    { flag: "s", name: "dotAll", description: "Dot (.) matches newlines" },
    { flag: "u", name: "unicode", description: "Unicode pattern matching" },
    { flag: "y", name: "sticky", description: "Match from lastIndex position" },
  ];

  const regexLiteral = pattern ? `/${pattern}/${flags}` : "";

  const commonPatterns: CommonPattern[] = useMemo(
    () => [
      {
        name: t("tools.regexTester.patterns.email"),
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        description: t("tools.regexTester.patterns.emailDesc"),
      },
      {
        name: t("tools.regexTester.patterns.url"),
        pattern:
          "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$",
        description: t("tools.regexTester.patterns.urlDesc"),
      },
      {
        name: t("tools.regexTester.patterns.phone"),
        pattern:
          "^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$",
        description: t("tools.regexTester.patterns.phoneDesc"),
      },
      {
        name: t("tools.regexTester.patterns.ipv4"),
        pattern:
          "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
        description: t("tools.regexTester.patterns.ipv4Desc"),
      },
      {
        name: t("tools.regexTester.patterns.hex"),
        pattern: "^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$",
        description: t("tools.regexTester.patterns.hexDesc"),
      },
      {
        name: t("tools.regexTester.patterns.date"),
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: t("tools.regexTester.patterns.dateDesc"),
      },
      {
        name: t("tools.regexTester.patterns.time"),
        pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$",
        description: t("tools.regexTester.patterns.timeDesc"),
      },
      {
        name: t("tools.regexTester.patterns.username"),
        pattern: "^[a-zA-Z0-9_-]{3,16}$",
        description: t("tools.regexTester.patterns.usernameDesc"),
      },
      {
        name: t("tools.regexTester.patterns.password"),
        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$",
        description: t("tools.regexTester.patterns.passwordDesc"),
      },
      {
        name: t("tools.regexTester.patterns.uuid"),
        pattern:
          "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        description: t("tools.regexTester.patterns.uuidDesc"),
      },
    ],
    [t],
  );

  const handlePatternChange = (value: string) => {
    setPattern(value);
  };

  const handleTestStringChange = (value: string) => {
    setTestString(value);
  };

  const handleFlagsChange = (flag: string) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.replace(flag, "") : prev + flag,
    );
  };

  const applyPattern = (commonPattern: CommonPattern) => {
    setPattern(commonPattern.pattern);
    setFlags("g");
  };

  const clearAll = () => {
    setPattern("");
    setTestString("");
    setFlags("g");
    setMatches([]);
    setError(null);
    setIsValid(null);
  };

  const explainPattern = () => {
    if (!pattern) return [];

    const explanations: Array<{ token: string; meaning: string }> = [];
    const tokens = pattern.split("");
    let i = 0;

    while (i < tokens.length) {
      const char = tokens[i];

      switch (char) {
        case "^":
          explanations.push({
            token: "^",
            meaning: t("tools.regexTester.explanation.startOfLine"),
          });
          break;
        case "$":
          explanations.push({
            token: "$",
            meaning: t("tools.regexTester.explanation.endOfLine"),
          });
          break;
        case ".":
          explanations.push({
            token: ".",
            meaning: t("tools.regexTester.explanation.anyChar"),
          });
          break;
        case "*":
          explanations.push({
            token: "*",
            meaning: t("tools.regexTester.explanation.zeroOrMore"),
          });
          break;
        case "+":
          explanations.push({
            token: "+",
            meaning: t("tools.regexTester.explanation.oneOrMore"),
          });
          break;
        case "?":
          explanations.push({
            token: "?",
            meaning: t("tools.regexTester.explanation.zeroOrOne"),
          });
          break;
        case "\\":
          if (i + 1 < tokens.length) {
            const next = tokens[i + 1];
            const escaped = `\\${next}`;
            const meanings: Record<string, string> = {
              "\\d": t("tools.regexTester.explanation.digit"),
              "\\D": t("tools.regexTester.explanation.nonDigit"),
              "\\w": t("tools.regexTester.explanation.wordChar"),
              "\\W": t("tools.regexTester.explanation.nonWordChar"),
              "\\s": t("tools.regexTester.explanation.whitespace"),
              "\\S": t("tools.regexTester.explanation.nonWhitespace"),
              "\\b": t("tools.regexTester.explanation.wordBoundary"),
              "\\B": t("tools.regexTester.explanation.nonWordBoundary"),
            };
            explanations.push({
              token: escaped,
              meaning:
                meanings[escaped] ||
                t("tools.regexTester.explanation.escaped", { char: next }),
            });
            i += 2;
            continue;
          }
          break;
        case "[": {
          let closeBracket = i + 1;
          while (closeBracket < tokens.length && tokens[closeBracket] !== "]") {
            closeBracket++;
          }
          if (closeBracket < tokens.length) {
            const charClass = pattern.slice(i, closeBracket + 1);
            explanations.push({
              token: charClass,
              meaning: t("tools.regexTester.explanation.charClass", {
                chars: charClass,
              }),
            });
            i = closeBracket + 1;
            continue;
          }
          break;
        }
        case "(": {
          let closeParen = i + 1;
          let depth = 1;
          while (closeParen < tokens.length && depth > 0) {
            if (tokens[closeParen] === "(") depth++;
            if (tokens[closeParen] === ")") depth--;
            closeParen++;
          }
          if (depth === 0) {
            const group = pattern.slice(i, closeParen);
            explanations.push({
              token: group,
              meaning: t("tools.regexTester.explanation.group"),
            });
            i = closeParen;
            continue;
          }
          break;
        }
        case "{": {
          let closeBrace = i + 1;
          while (closeBrace < tokens.length && tokens[closeBrace] !== "}") {
            closeBrace++;
          }
          if (closeBrace < tokens.length) {
            const quantifier = pattern.slice(i, closeBrace + 1);
            explanations.push({
              token: quantifier,
              meaning: t("tools.regexTester.explanation.quantifier", {
                q: quantifier,
              }),
            });
            i = closeBrace + 1;
            continue;
          }
          break;
        }
        case "|":
          explanations.push({
            token: "|",
            meaning: t("tools.regexTester.explanation.or"),
          });
          break;
        default:
          if (/[a-zA-Z0-9]/.test(char)) {
            let literal = char;
            let j = i + 1;
            while (j < tokens.length && /[a-zA-Z0-9]/.test(tokens[j])) {
              literal += tokens[j];
              j++;
            }
            explanations.push({
              token: literal,
              meaning: t("tools.regexTester.explanation.literal", {
                text: literal,
              }),
            });
            i = j;
            continue;
          }
      }
      i++;
    }

    return explanations;
  };

  // Auto-test regex pattern whenever pattern, test string, or flags change.
  // This provides real-time feedback without requiring a manual "Test" button.
  // The state updates are intentional for synchronizing test results with inputs.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pattern) {
      setMatches([]);
      setError(null);
      setIsValid(null);
      return;
    }

    try {
      const regex = new RegExp(pattern, flags);
      setError(null);
      setIsValid(true);

      if (!testString) {
        setMatches([]);
        return;
      }

      const foundMatches: RegexMatch[] = [];
      let match;

      if (flags.includes("g")) {
        while ((match = regex.exec(testString)) !== null) {
          foundMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
        }
      } else {
        match = regex.exec(testString);
        if (match) {
          foundMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
          });
        }
      }

      setMatches(foundMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid regex pattern");
      setIsValid(false);
      setMatches([]);
    }
  }, [pattern, testString, flags]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Pattern Input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">
                {t("tools.regexTester.pattern")}
              </CardTitle>
              <CardDescription>
                {t("tools.regexTester.patternDescription")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isValid !== null && (
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("tools.regexTester.valid")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      {t("tools.regexTester.invalid")}
                    </Badge>
                  )}
                </div>
              )}
              {pattern && isValid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyWithAnimation(regexLiteral)}
                  className={cn("gap-1", copyAnimationClass)}
                >
                  <Copy className="w-3 h-3" />
                  {t("tools.regexTester.copyPattern")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Leading slash */}
              <div className="flex items-center justify-center w-8 h-10 bg-muted rounded-md border font-mono text-muted-foreground">
                /
              </div>

              {/* Pattern input */}
              <Input
                placeholder={t("tools.regexTester.patternPlaceholder")}
                value={pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                className="font-mono flex-1"
              />

              {/* Trailing slash + flags */}
              <div className="flex items-center justify-center min-w-12 h-10 px-2 bg-muted rounded-md border font-mono text-muted-foreground">
                /{flags}
              </div>
            </div>

            {error && (
              <div className="p-2 bg-destructive/10 rounded-md text-destructive text-sm flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t("tools.regexTester.flags")}:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="font-mono">{flags || "none"}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel>
                  {t("tools.regexTester.selectFlags")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {flagDefinitions.map(({ flag, name, description }) => (
                  <DropdownMenuCheckboxItem
                    key={flag}
                    checked={flags.includes(flag)}
                    onCheckedChange={() => handleFlagsChange(flag)}
                    onSelect={(e) => e.preventDefault()}
                    className="font-mono"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{flag}</span>
                        <span className="text-muted-foreground font-sans text-xs">
                          ({name})
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-sans">
                        {description}
                      </span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Explanation */}
      {pattern && isValid && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <CardTitle className="text-base">
                {t("tools.regexTester.explanation.title")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {explainPattern().map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                >
                  <code className="px-2 py-1 bg-background rounded text-sm font-mono shrink-0">
                    {exp.token}
                  </code>
                  <span className="text-sm text-muted-foreground">
                    {exp.meaning}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test String */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("tools.regexTester.testString")}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t("common.clear")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <Textarea
            placeholder={t("tools.regexTester.testStringPlaceholder")}
            value={testString}
            onChange={(e) => handleTestStringChange(e.target.value)}
            className="font-mono text-sm h-full min-h-32 resize-none"
          />
        </CardContent>
      </Card>

      {/* Matches */}
      {matches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {t("tools.regexTester.matches")}
                </CardTitle>
                <CardDescription>
                  {t("tools.regexTester.matchesFound", {
                    count: matches.length,
                  })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {matches.map((match, idx) => (
                <div key={idx} className="p-3 rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{idx + 1}</Badge>
                      <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                        {match.match}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {t("tools.regexTester.position")}: {match.index}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyWithAnimation(match.match)}
                      className={cn("h-7", copyAnimationClass)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {match.groups.length > 0 && (
                    <div className="pl-4 space-y-1">
                      {match.groups.map((group, gIdx) => (
                        <div
                          key={gIdx}
                          className="text-sm text-muted-foreground"
                        >
                          {t("tools.regexTester.group")} {gIdx + 1}:{" "}
                          <code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">
                            {group}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("tools.regexTester.commonPatterns")}
          </CardTitle>
          <CardDescription>
            {t("tools.regexTester.commonPatternsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {commonPatterns.map((cp, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto p-3 justify-start text-left"
                onClick={() => applyPattern(cp)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-medium text-sm">{cp.name}</span>
                  <code className="text-xs font-mono text-muted-foreground truncate">
                    {cp.pattern}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {cp.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
