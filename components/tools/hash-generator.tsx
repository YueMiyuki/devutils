"use client";

import type React from "react";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, Upload, FileIcon, CheckCircle2 } from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";
import CryptoJS from "crypto-js";
import bcrypt from "bcryptjs";
import {
  md5,
  sha1,
  sha224,
  sha256,
  sha384,
  sha512,
  sha3,
  argon2id,
  createMD5,
  createSHA1,
  createSHA224,
  createSHA256,
  createSHA384,
  createSHA512,
  createSHA3,
} from "hash-wasm";

type HashAlgorithm =
  | "md5"
  | "sha1"
  | "sha224"
  | "sha256"
  | "sha384"
  | "sha512"
  | "sha3-224"
  | "sha3-256"
  | "sha3-384"
  | "sha3-512"
  | "bcrypt"
  | "argon2";

interface HashGeneratorProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HashGenerator({ tabId: _tabId }: HashGeneratorProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [outputHash, setOutputHash] = useState("");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("sha256");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileResult, setFileResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bcryptRounds, setBcryptRounds] = useState(10);
  const [argon2Salt, setArgon2Salt] = useState("");
  const [argon2Iterations, setArgon2Iterations] = useState(3);
  const [argon2Memory, setArgon2Memory] = useState(4096);
  const [argon2Parallelism, setArgon2Parallelism] = useState(1);
  const [argon2HashLength, setArgon2HashLength] = useState(32);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const hashFileStream = useCallback(
    async (
      file: File,
      onProgress: (percent: number) => void,
    ): Promise<string> => {
      const CHUNK_SIZE = 64 * 1024; // 64KB chunks
      const MAX_FILE_SIZE_FOR_NON_STREAMING = 10 * 1024 * 1024;
      const fileSize = file.size;
      let offset = 0;

      let hasher;
      try {
        switch (algorithm) {
          case "md5":
            hasher = await createMD5();
            break;
          case "sha1":
            hasher = await createSHA1();
            break;
          case "sha224":
            hasher = await createSHA224();
            break;
          case "sha256":
            hasher = await createSHA256();
            break;
          case "sha384":
            hasher = await createSHA384();
            break;
          case "sha512":
            hasher = await createSHA512();
            break;
          case "sha3-224":
            hasher = await createSHA3(224);
            break;
          case "sha3-256":
            hasher = await createSHA3(256);
            break;
          case "sha3-384":
            hasher = await createSHA3(384);
            break;
          case "sha3-512":
            hasher = await createSHA3(512);
            break;
          case "bcrypt": {
            // BCrypt doesn't support streaming, read whole file
            if (fileSize > MAX_FILE_SIZE_FOR_NON_STREAMING) {
              throw new Error(
                `File too large for BCrypt (max 10MB). Current: ${(fileSize / (1024 * 1024)).toFixed(1)}MB`,
              );
            }
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const text = new TextDecoder().decode(uint8Array);
            onProgress(50);
            const hash = await bcrypt.hash(text, bcryptRounds);
            onProgress(100);
            return hash;
          }
          case "argon2": {
            // Argon2 doesn't support streaming, read whole file
            if (fileSize > MAX_FILE_SIZE_FOR_NON_STREAMING) {
              throw new Error(
                `File too large for Argon2 (max 10MB). Current: ${(fileSize / (1024 * 1024)).toFixed(1)}MB`,
              );
            }
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const text = new TextDecoder().decode(uint8Array);
            onProgress(50);
            const salt =
              argon2Salt || CryptoJS.lib.WordArray.random(16).toString();
            const hash = await argon2id({
              password: text,
              salt: new TextEncoder().encode(salt),
              parallelism: argon2Parallelism,
              iterations: argon2Iterations,
              memorySize: argon2Memory,
              hashLength: argon2HashLength,
              outputType: "encoded",
            });
            onProgress(100);
            return hash;
          }
          default:
            throw new Error(
              t("tools.hashGenerator.errors.unsupportedAlgorithm"),
            );
        }

        hasher.init();

        while (offset < fileSize) {
          const chunk = file.slice(offset, offset + CHUNK_SIZE);
          const arrayBuffer = await chunk.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          hasher.update(uint8Array);

          offset += CHUNK_SIZE;
          const progress = Math.min((offset / fileSize) * 100, 99);
          onProgress(Math.floor(progress));

          // Don't block
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const hash = hasher.digest();
        onProgress(100);
        return hash;
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? err.message
            : t("tools.hashGenerator.errors.hashFailed"),
        );
      }
    },
    [
      algorithm,
      bcryptRounds,
      argon2Salt,
      argon2Iterations,
      argon2Memory,
      argon2Parallelism,
      argon2HashLength,
      t,
    ],
  );

  const hashText = useCallback(
    async (text: string): Promise<string> => {
      try {
        switch (algorithm) {
          case "md5":
            return await md5(text);
          case "sha1":
            return await sha1(text);
          case "sha224":
            return await sha224(text);
          case "sha256":
            return await sha256(text);
          case "sha384":
            return await sha384(text);
          case "sha512":
            return await sha512(text);
          case "sha3-224":
            return await sha3(text, 224);
          case "sha3-256":
            return await sha3(text, 256);
          case "sha3-384":
            return await sha3(text, 384);
          case "sha3-512":
            return await sha3(text, 512);
          case "bcrypt":
            return await bcrypt.hash(text, bcryptRounds);
          case "argon2": {
            const salt =
              argon2Salt || CryptoJS.lib.WordArray.random(16).toString();
            const hash = await argon2id({
              password: text,
              salt: new TextEncoder().encode(salt),
              parallelism: argon2Parallelism,
              iterations: argon2Iterations,
              memorySize: argon2Memory,
              hashLength: argon2HashLength,
              outputType: "encoded",
            });
            return hash;
          }
          default:
            throw new Error(
              t("tools.hashGenerator.errors.unsupportedAlgorithm"),
            );
        }
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? err.message
            : t("tools.hashGenerator.errors.hashFailed"),
        );
      }
    },
    [
      algorithm,
      bcryptRounds,
      argon2Salt,
      argon2Iterations,
      argon2Memory,
      argon2Parallelism,
      argon2HashLength,
      t,
    ],
  );

  const handleInputChange = async (value: string) => {
    setInputText(value);
    setError(null);

    if (!value.trim()) {
      setOutputHash("");
      return;
    }

    try {
      setIsProcessing(true);
      const hash = await hashText(value);
      setOutputHash(hash);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.hashGenerator.errors.processingFailed"),
      );
      setOutputHash("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlgorithmChange = (newAlgorithm: HashAlgorithm) => {
    setAlgorithm(newAlgorithm);
    setError(null);
  };

  useEffect(() => {
    if (inputText.trim()) {
      handleInputChange(inputText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    algorithm,
    bcryptRounds,
    argon2Salt,
    argon2Iterations,
    argon2Memory,
    argon2Parallelism,
    argon2HashLength,
  ]);

  const clearAll = () => {
    setInputText("");
    setOutputHash("");
    setError(null);
    setFileInfo(null);
    setFileResult(null);
    setProgress(0);
  };

  const processFile = useCallback(
    async (file: File) => {
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type || "unknown",
      });
      setIsProcessing(true);
      setProgress(0);
      setFileResult(null);
      setError(null);

      try {
        const hash = await hashFileStream(file, (percent) => {
          setProgress(percent);
        });
        setFileResult(hash);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("tools.hashGenerator.errors.failedToProcess"),
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [hashFileStream, t],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "drop") {
            const filePath = event.payload.paths[0];
            if (filePath) {
              readFile(filePath)
                .then((uint8Array) => {
                  const fileName =
                    filePath.split(/[\\/]/).pop() || "dropped-file";
                  const blob = new Blob([uint8Array]);
                  const file = new File([blob], fileName, { type: blob.type });
                  processFile(file);
                })
                .catch((error) => {
                  console.error("Error processing dropped file:", error);
                  setError(t("tools.hashGenerator.errors.failedToProcess"));
                });
            }
          }
        });
      } catch (error) {
        console.error("Error setting up Tauri listener:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [processFile, t]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="text">
            {t("tools.hashGenerator.textTab")}
          </TabsTrigger>
          <TabsTrigger value="file">
            {t("tools.hashGenerator.fileTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Algorithm Selection & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Select
                value={algorithm}
                onValueChange={(v) => handleAlgorithmChange(v as HashAlgorithm)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md5">MD5</SelectItem>
                  <SelectItem value="sha1">SHA-1</SelectItem>
                  <SelectItem value="sha224">SHA-224</SelectItem>
                  <SelectItem value="sha256">SHA-256</SelectItem>
                  <SelectItem value="sha384">SHA-384</SelectItem>
                  <SelectItem value="sha512">SHA-512</SelectItem>
                  <SelectItem value="sha3-224">SHA3-224</SelectItem>
                  <SelectItem value="sha3-256">SHA3-256</SelectItem>
                  <SelectItem value="sha3-384">SHA3-384</SelectItem>
                  <SelectItem value="sha3-512">SHA3-512</SelectItem>
                  <SelectItem value="bcrypt">BCrypt</SelectItem>
                  <SelectItem value="argon2">Argon2</SelectItem>
                </SelectContent>
              </Select>

              {algorithm === "bcrypt" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.bcryptRounds")}:
                  </span>
                  <Input
                    type="number"
                    min={4}
                    max={15}
                    value={bcryptRounds}
                    onChange={(e) => setBcryptRounds(parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("tools.hashGenerator.clear")}
            </Button>
          </div>

          {/* Argon2 Parameters */}
          {algorithm === "argon2" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.hashGenerator.argon2Params")}
                </CardTitle>
                <CardDescription>
                  {t("tools.hashGenerator.argon2ParamsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.iterations")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={argon2Iterations}
                    onChange={(e) =>
                      setArgon2Iterations(parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.memory")} (KB)
                  </label>
                  <Input
                    type="number"
                    min={8}
                    value={argon2Memory}
                    onChange={(e) => setArgon2Memory(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.parallelism")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={argon2Parallelism}
                    onChange={(e) =>
                      setArgon2Parallelism(parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.hashLength")}
                  </label>
                  <Input
                    type="number"
                    min={4}
                    value={argon2HashLength}
                    onChange={(e) =>
                      setArgon2HashLength(parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.hashGenerator.salt")} (
                    {t("tools.hashGenerator.optional")})
                  </label>
                  <Input
                    type="text"
                    value={argon2Salt}
                    onChange={(e) => setArgon2Salt(e.target.value)}
                    placeholder={t("tools.hashGenerator.saltPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input/Output Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.hashGenerator.input")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Textarea
                  placeholder={t("tools.hashGenerator.inputPlaceholder")}
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="font-mono text-sm h-full min-h-48 resize-none"
                />
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("tools.hashGenerator.output")}
                  </CardTitle>
                  {outputHash && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyWithAnimation(outputHash)}
                      className={copyAnimationClass}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {t("tools.hashGenerator.copy")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {error ? (
                  <div className="p-4 bg-destructive/10 rounded-md text-destructive text-sm">
                    {error}
                  </div>
                ) : (
                  <Textarea
                    value={outputHash}
                    readOnly
                    className="font-mono text-sm h-full min-h-48 resize-none"
                    placeholder={
                      isProcessing
                        ? t("tools.hashGenerator.processing")
                        : t("tools.hashGenerator.outputPlaceholder")
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          {(inputText || outputHash) && (
            <Card>
              <CardContent className="py-3">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("tools.hashGenerator.stats.input")}{" "}
                    </span>
                    <span className="font-mono">
                      {inputText.length} {t("tools.hashGenerator.stats.chars")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("tools.hashGenerator.stats.output")}{" "}
                    </span>
                    <span className="font-mono">
                      {outputHash.length} {t("tools.hashGenerator.stats.chars")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("tools.hashGenerator.stats.algorithm")}{" "}
                    </span>
                    <span className="font-mono">{algorithm.toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="file" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Algorithm Selection */}
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={algorithm}
              onValueChange={(v) => handleAlgorithmChange(v as HashAlgorithm)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="md5">MD5</SelectItem>
                <SelectItem value="sha1">SHA-1</SelectItem>
                <SelectItem value="sha224">SHA-224</SelectItem>
                <SelectItem value="sha256">SHA-256</SelectItem>
                <SelectItem value="sha384">SHA-384</SelectItem>
                <SelectItem value="sha512">SHA-512</SelectItem>
                <SelectItem value="sha3-224">SHA3-224</SelectItem>
                <SelectItem value="sha3-256">SHA3-256</SelectItem>
                <SelectItem value="sha3-384">SHA3-384</SelectItem>
                <SelectItem value="sha3-512">SHA3-512</SelectItem>
                <SelectItem value="bcrypt">BCrypt</SelectItem>
                <SelectItem value="argon2">Argon2</SelectItem>
              </SelectContent>
            </Select>

            {algorithm === "bcrypt" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("tools.hashGenerator.bcryptRounds")}:
                </span>
                <Input
                  type="number"
                  min={4}
                  max={31}
                  value={bcryptRounds}
                  onChange={(e) => setBcryptRounds(parseInt(e.target.value, 10))}
                  className="w-20"
                />
              </div>
            )}
          </div>

          {/* File Drop Zone */}
          <Card className="flex-1 border-2 border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-64 gap-4">
              {!fileInfo ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      {t("tools.hashGenerator.file.dropZone")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("tools.hashGenerator.file.dropZoneDescription")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("tools.hashGenerator.file.selectFile")}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    {isProcessing ? (
                      <div className="animate-pulse">
                        <FileIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{fileInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(fileInfo.size)} • {fileInfo.type}
                    </p>
                  </div>
                  {isProcessing && (
                    <div className="w-full max-w-xs space-y-2">
                      <Progress value={progress} />
                      <p className="text-sm text-center text-muted-foreground">
                        {t("tools.hashGenerator.file.processing")} {progress}%
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFileInfo(null);
                        setFileResult(null);
                        setProgress(0);
                      }}
                    >
                      {t("tools.hashGenerator.file.clear")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("tools.hashGenerator.file.chooseAnother")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* File Result */}
          {fileResult && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {t("tools.hashGenerator.file.output", {
                        algorithm: algorithm.toUpperCase(),
                      })}
                    </CardTitle>
                    <CardDescription>
                      {t("tools.hashGenerator.file.outputDescription")}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyWithAnimation(fileResult)}
                    className={copyAnimationClass}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("tools.hashGenerator.copy")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={fileResult}
                  readOnly
                  className="font-mono text-xs h-32"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
