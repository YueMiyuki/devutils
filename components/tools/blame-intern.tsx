"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GitBranch,
  Copy,
  RefreshCw,
  AlertTriangle,
  User,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  filesChanged: string[];
}

const bugMessages = [
  "quick fix, will refactor later",
  "works on my machine",
  "not sure why this works but dont touch",
  "TODO: figure out what this does",
  "hotfix for prod issue",
  "oops",
  "final fix v2",
  "please work",
  "temporary solution (permanent)",
  "trust me bro",
  "i have no idea what im doing",
  "this should fix it maybe",
  "yolo deploy",
  "friday afternoon commit",
  "dont blame me",
];

const fileTypes = [
  "api/auth.ts",
  "utils/helpers.js",
  "components/Button.tsx",
  "lib/database.ts",
  "services/payment.ts",
  "hooks/useAuth.ts",
  "middleware/cors.ts",
  "config/settings.ts",
];

function generateHash(): string {
  return Math.random().toString(16).substring(2, 9);
}

function generateDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return (
    date.toISOString().split("T")[0] +
    " " +
    String(Math.floor(Math.random() * 24)).padStart(2, "0") +
    ":" +
    String(Math.floor(Math.random() * 60)).padStart(2, "0")
  );
}

interface BlameInternProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BlameIntern({ tabId: _tabId }: BlameInternProps) {
  const { t } = useTranslation();
  const [bugDescription, setBugDescription] = useState("");
  const [internName, setInternName] = useState("Jordan");
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const generateBlameHistory = () => {
    if (!bugDescription) {
      toast.error(t("tools.blameIntern.errors.noBugDescription"));
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const numCommits = Math.floor(Math.random() * 4) + 3;
      const newCommits: GitCommit[] = [];

      for (let i = 0; i < numCommits; i++) {
        const isIntern =
          i === Math.floor(numCommits / 2) || i === numCommits - 1;
        newCommits.push({
          hash: generateHash(),
          author: isIntern
            ? internName
            : ["Alex Chen", "Sarah Miller", "Mike Johnson"][
                Math.floor(Math.random() * 3)
              ],
          date: generateDate(numCommits - i + Math.floor(Math.random() * 5)),
          message: isIntern
            ? bugMessages[Math.floor(Math.random() * bugMessages.length)]
            : [
                "Refactor: improve code quality",
                "Add tests for edge cases",
                "Update dependencies",
                "Code review fixes",
              ][Math.floor(Math.random() * 4)],
          filesChanged: [
            fileTypes[Math.floor(Math.random() * fileTypes.length)],
          ],
        });
      }

      setCommits(newCommits);
      setIsGenerating(false);
      toast.success(t("tools.blameIntern.success.generated"), {
        description: t("tools.blameIntern.success.generatedDescription", {
          internName,
        }),
      });
    }, 1800);
  };

  const copyGitLog = async () => {
    const gitLog = commits
      .map(
        (c) =>
          `commit ${c.hash}\nAuthor: ${c.author}\nDate: ${c.date}\n\n    ${c.message}\n\nFiles: ${c.filesChanged.join(", ")}\n`,
      )
      .join("\n");

    await copyWithAnimation(gitLog);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const copyCommit = async (commit: GitCommit) => {
    const commitText = `commit ${commit.hash}\nAuthor: ${commit.author}\nDate: ${commit.date}\n\n    ${commit.message}\n\nFiles: ${commit.filesChanged.join(", ")}`;

    await copyWithAnimation(commitText);
    setCopiedHash(commit.hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <TooltipProvider>
      <div className="h-full space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div
            className="
            flex size-10 items-center justify-center rounded-lg bg-orange-500/10
            text-orange-500
          "
          >
            <GitBranch className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {t("tools.blameIntern.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("tools.blameIntern.subtitle")}
            </p>
          </div>
        </div>

        <div
          className="
          grid gap-6
          lg:grid-cols-2
        "
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("tools.blameIntern.bugDetails")}
              </CardTitle>
              <CardDescription>
                {t("tools.blameIntern.bugDetailsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="intern-name">
                  {t("tools.blameIntern.internName")}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User
                      className="
                      absolute top-1/2 left-3 size-4 -translate-y-1/2
                      text-muted-foreground
                    "
                    />
                    <Input
                      id="intern-name"
                      value={internName}
                      onChange={(e) => setInternName(e.target.value)}
                      className="pl-9"
                      placeholder={t("tools.blameIntern.internNamePlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-description">
                  {t("tools.blameIntern.bugDescription")}
                </Label>
                <Textarea
                  id="bug-description"
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder={t("tools.blameIntern.bugDescriptionPlaceholder")}
                  className="min-h-24 resize-none"
                />
              </div>

              <Button
                onClick={generateBlameHistory}
                className="
                  w-full transition-all duration-200
                  hover:shadow-md
                  active:scale-[0.98]
                "
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    {t("tools.blameIntern.generating")}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 size-4" />
                    {t("tools.blameIntern.generate")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className="
              flex flex-row items-center justify-between space-y-0
            "
            >
              <div>
                <CardTitle className="text-base">
                  {t("tools.blameIntern.output")}
                </CardTitle>
                <CardDescription>
                  {t("tools.blameIntern.outputDescription")}
                </CardDescription>
              </div>
              {commits.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyGitLog}
                  className={`
                    ${copyAnimationClass}
                    bg-transparent transition-all duration-200
                    hover:bg-primary hover:text-primary-foreground
                    active:scale-95
                  `}
                >
                  {copiedLog ? (
                    <>
                      <Check className="mr-2 size-4 text-green-500" />
                      {t("tools.blameIntern.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 size-4" />
                      {t("tools.blameIntern.copyLog")}
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {commits.length === 0 ? (
                  <div
                    className="
                    flex h-full flex-col items-center justify-center py-12
                    text-center text-muted-foreground
                  "
                  >
                    <GitBranch className="mb-4 size-12 opacity-20" />
                    <p className="text-sm">
                      {t("tools.blameIntern.noHistory")}
                    </p>
                    <p className="text-xs">
                      {t("tools.blameIntern.noHistoryHint")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commits.map((commit) => {
                      const isInternCommit = commit.author === internName;
                      const isCopied = copiedHash === commit.hash;
                      return (
                        <div
                          key={commit.hash}
                          className={`
                            group cursor-pointer rounded-lg border p-3
                            transition-all duration-200
                            hover:-translate-y-0.5 hover:shadow-md
                            ${
                              isInternCommit
                                ? `
                                border-destructive/50 bg-destructive/5
                                hover:border-destructive
                              `
                                : `
                                border-border bg-muted/30
                                hover:border-primary/50
                              `
                            }
                          `}
                          onClick={() => copyCommit(commit)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              className="
                              size-8 transition-transform
                              group-hover:scale-110
                            "
                            >
                              <AvatarFallback
                                className={
                                  isInternCommit
                                    ? `
                                      bg-destructive text-destructive-foreground
                                    `
                                    : ""
                                }
                              >
                                {commit.author
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">
                                  {commit.author}
                                </span>
                                {isInternCommit && (
                                  <Badge
                                    variant="destructive"
                                    className="animate-pulse text-[10px]"
                                  >
                                    {t("tools.blameIntern.internBadge")}
                                  </Badge>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`
                                        ml-auto transition-all duration-200
                                        ${
                                          isCopied
                                            ? `opacity-100`
                                            : `
                                          opacity-0
                                          group-hover:opacity-100
                                        `
                                        }
                                      `}
                                    >
                                      {isCopied ? (
                                        <Check className="size-4 text-green-500" />
                                      ) : (
                                        <Copy
                                          className="
                                          size-4 text-muted-foreground
                                        "
                                        />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {isCopied
                                        ? t("tools.blameIntern.copied")
                                        : t(
                                            "tools.blameIntern.copyCommitTooltip",
                                          )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <code
                                className="
                                font-mono text-xs text-muted-foreground
                              "
                              >
                                {commit.hash}
                              </code>
                              <p className="mt-1 text-sm">{commit.message}</p>
                              <div
                                className="
                                mt-2 flex items-center gap-2 text-xs
                                text-muted-foreground
                              "
                              >
                                <span>{commit.date}</span>
                                <span>•</span>
                                <span className="font-mono">
                                  {commit.filesChanged[0]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
