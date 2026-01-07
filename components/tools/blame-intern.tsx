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

export function BlameIntern() {
  const [bugDescription, setBugDescription] = useState("");
  const [internName, setInternName] = useState("Jordan");
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const generateBlameHistory = () => {
    if (!bugDescription) {
      toast.error("Please describe the bug first!");
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
      toast.success("Blame history generated!", {
        description: `${internName} has been successfully blamed.`,
      });
    }, 800);
  };

  const copyGitLog = async () => {
    const gitLog = commits
      .map(
        (c) =>
          `commit ${c.hash}\nAuthor: ${c.author}\nDate: ${c.date}\n\n    ${c.message}\n`,
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
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Blame The Intern Stapler</h1>
            <p className="text-sm text-muted-foreground">
              Generate fake git history that pins any bug on a fictional intern
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bug Details</CardTitle>
              <CardDescription>
                Describe the bug and customize the scapegoat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="intern-name">Intern Name</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="intern-name"
                      value={internName}
                      onChange={(e) => setInternName(e.target.value)}
                      className="pl-9"
                      placeholder="Jordan"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-description">Bug Description</Label>
                <Textarea
                  id="bug-description"
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder="e.g., Login button doesn't work on Safari, Database timeouts on high traffic..."
                  className="min-h-24 resize-none"
                />
              </div>

              <Button
                onClick={generateBlameHistory}
                className="w-full transition-all duration-200 active:scale-[0.98] hover:shadow-md"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Blame...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Generate Blame History
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Git Blame Output</CardTitle>
                <CardDescription>
                  Totally legitimate commit history
                </CardDescription>
              </div>
              {commits.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyGitLog}
                  className={`${copyAnimationClass} transition-all duration-200 active:scale-95 hover:bg-primary hover:text-primary-foreground bg-transparent`}
                >
                  {copiedLog ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Log
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {commits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
                    <GitBranch className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">No blame history generated yet</p>
                    <p className="text-xs">Describe a bug and click generate</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commits.map((commit) => {
                      const isInternCommit = commit.author === internName;
                      const isCopied = copiedHash === commit.hash;
                      return (
                        <div
                          key={commit.hash}
                          className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group ${
                            isInternCommit
                              ? "border-destructive/50 bg-destructive/5 hover:border-destructive"
                              : "border-border bg-muted/30 hover:border-primary/50"
                          }`}
                          onClick={() => copyCommit(commit)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8 transition-transform group-hover:scale-110">
                              <AvatarFallback
                                className={
                                  isInternCommit
                                    ? "bg-destructive text-destructive-foreground"
                                    : ""
                                }
                              >
                                {commit.author
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {commit.author}
                                </span>
                                {isInternCommit && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] animate-pulse"
                                  >
                                    INTERN
                                  </Badge>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`ml-auto transition-all duration-200 ${isCopied ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                    >
                                      {isCopied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {isCopied
                                        ? "Copied!"
                                        : "Click to copy commit"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <code className="text-xs text-muted-foreground font-mono">
                                {commit.hash}
                              </code>
                              <p className="mt-1 text-sm">{commit.message}</p>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
