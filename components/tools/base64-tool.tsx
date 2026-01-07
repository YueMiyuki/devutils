"use client";

import type React from "react";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Copy,
  ArrowDownUp,
  Trash2,
  Upload,
  Download,
  FileIcon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";

type BaseFormat = "base16" | "base32" | "base64" | "base64url" | "ascii85";

interface Base64ToolProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Base64Tool({ tabId: _tabId }: Base64ToolProps) {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [baseFormat, setBaseFormat] = useState<BaseFormat>("base64");
  const [error, setError] = useState<string | null>(null);

  // File handling state
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileResult, setFileResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  // Base16 (Hex) encoding/decoding
  const encodeBase16 = (text: string): string => {
    const utf8Bytes = new TextEncoder().encode(text);
    return Array.from(utf8Bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const decodeBase16 = (text: string): string => {
    const hex = text.trim().replace(/\s/g, "");
    if (!/^[0-9A-Fa-f]*$/.test(hex)) throw new Error("Invalid hex string");
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string: odd number of characters");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return new TextDecoder().decode(bytes);
  };

  // Base32 encoding/decoding
  const encodeBase32 = (text: string): string => {
    const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const utf8Bytes = new TextEncoder().encode(text);
    let bits = 0;
    let value = 0;
    let output = "";

    for (let i = 0; i < utf8Bytes.length; i++) {
      value = (value << 8) | utf8Bytes[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    while (output.length % 8 !== 0) {
      output += "=";
    }

    return output;
  };

  const decodeBase32 = (text: string): string => {
    const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const input = text.trim().replace(/=+$/, "").toUpperCase();
    if (!/^[A-Z2-7]*$/.test(input)) throw new Error("Invalid Base32 string");

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < input.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(input[i]);
      if (idx === -1) throw new Error("Invalid Base32 character");

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new TextDecoder().decode(new Uint8Array(output));
  };

  // Base64 encoding/decoding
  const encodeBase64 = (text: string): string => {
    const utf8Bytes = new TextEncoder().encode(text);
    const binaryString = Array.from(utf8Bytes)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binaryString);
  };

  const decodeBase64 = (text: string): string => {
    const binaryString = atob(text.trim());
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  };

  // Base64URL encoding/decoding
  const encodeBase64URL = (text: string): string => {
    return encodeBase64(text)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const decodeBase64URL = (text: string): string => {
    let base64 = text.trim().replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return decodeBase64(base64);
  };

  // Encode bytes to Base16 (Hex)
  const encodeBytesToBase16 = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  // Encode bytes to Base32
  const encodeBytesToBase32 = (bytes: Uint8Array): string => {
    const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    while (output.length % 8 !== 0) {
      output += "=";
    }

    return output;
  };

  // Encode bytes to Base64
  const encodeBytesToBase64 = (bytes: Uint8Array): string => {
    const binaryString = Array.from(bytes)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binaryString);
  };

  // Encode bytes to Base64URL
  const encodeBytesToBase64URL = (bytes: Uint8Array): string => {
    return encodeBytesToBase64(bytes)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  // Encode bytes to ASCII85
  const encodeBytesToAscii85 = (bytes: Uint8Array): string => {
    let output = "";

    for (let i = 0; i < bytes.length; i += 4) {
      let value = 0;
      const count = Math.min(4, bytes.length - i);

      for (let j = 0; j < count; j++) {
        value = value * 256 + bytes[i + j];
      }

      if (count < 4) {
        for (let j = count; j < 4; j++) {
          value = value * 256;
        }
      }

      if (value === 0 && count === 4) {
        output += "z";
      } else {
        const encoded = [];
        for (let j = 0; j < 5; j++) {
          encoded.unshift(String.fromCharCode(33 + (value % 85)));
          value = Math.floor(value / 85);
        }
        output += encoded.slice(0, count + 1).join("");
      }
    }

    return "<~" + output + "~>";
  };

  // Encode bytes according to selected format
  const encodeBytesToFormat = (bytes: Uint8Array, format: BaseFormat): string => {
    switch (format) {
      case "base16":
        return encodeBytesToBase16(bytes);
      case "base32":
        return encodeBytesToBase32(bytes);
      case "base64":
        return encodeBytesToBase64(bytes);
      case "base64url":
        return encodeBytesToBase64URL(bytes);
      case "ascii85":
        return encodeBytesToAscii85(bytes);
      default:
        throw new Error("Unsupported format");
    }
  };

  // ASCII85 encoding/decoding
  const encodeAscii85 = (text: string): string => {
    const utf8Bytes = new TextEncoder().encode(text);
    let output = "";

    for (let i = 0; i < utf8Bytes.length; i += 4) {
      let value = 0;
      const count = Math.min(4, utf8Bytes.length - i);

      for (let j = 0; j < count; j++) {
        value = value * 256 + utf8Bytes[i + j];
      }

      if (count < 4) {
        for (let j = count; j < 4; j++) {
          value = value * 256;
        }
      }

      if (value === 0 && count === 4) {
        output += "z";
      } else {
        const encoded = [];
        for (let j = 0; j < 5; j++) {
          encoded.unshift(String.fromCharCode(33 + (value % 85)));
          value = Math.floor(value / 85);
        }
        output += encoded.slice(0, count + 1).join("");
      }
    }

    return "<~" + output + "~>";
  };

  const decodeAscii85 = (text: string): string => {
    let input = text.trim();
    if (input.startsWith("<~")) input = input.slice(2);
    if (input.endsWith("~>")) input = input.slice(0, -2);

    const output: number[] = [];

    for (let i = 0; i < input.length; ) {
      if (input[i] === "z") {
        output.push(0, 0, 0, 0);
        i++;
        continue;
      }

      let value = 0;
      let count = 0;

      for (let j = 0; j < 5 && i + j < input.length; j++) {
        const code = input.charCodeAt(i + j);
        if (code < 33 || code > 117)
          throw new Error("Invalid ASCII85 character");
        value = value * 85 + (code - 33);
        count++;
      }

      for (let j = count; j < 5; j++) {
        value = value * 85 + 84;
      }

      const bytes = [
        (value >>> 24) & 255,
        (value >>> 16) & 255,
        (value >>> 8) & 255,
        value & 255,
      ];

      output.push(...bytes.slice(0, count - 1));
      i += count;
    }

    return new TextDecoder().decode(new Uint8Array(output));
  };

  const encode = useCallback(
    (text: string): string => {
      try {
        switch (baseFormat) {
          case "base16":
            return encodeBase16(text);
          case "base32":
            return encodeBase32(text);
          case "base64":
            return encodeBase64(text);
          case "base64url":
            return encodeBase64URL(text);
          case "ascii85":
            return encodeAscii85(text);
          default:
            throw new Error("Unsupported format");
        }
      } catch {
        throw new Error("Failed to encode");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFormat],
  );

  const decode = useCallback(
    (text: string): string => {
      try {
        switch (baseFormat) {
          case "base16":
            return decodeBase16(text);
          case "base32":
            return decodeBase32(text);
          case "base64":
            return decodeBase64(text);
          case "base64url":
            return decodeBase64URL(text);
          case "ascii85":
            return decodeAscii85(text);
          default:
            throw new Error("Unsupported format");
        }
      } catch {
        throw new Error(`Invalid ${baseFormat.toUpperCase()} string`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFormat],
  );

  // Auto-trigger conversion when base format changes
  useEffect(() => {
    if (inputText.trim()) {
      try {
        if (mode === "encode") {
          setOutputText(encode(inputText));
        } else {
          setOutputText(decode(inputText));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Processing failed");
        setOutputText("");
      }
    }
  }, [baseFormat, encode, decode, inputText, mode]);

  const handleInputChange = (value: string) => {
    setInputText(value);
    setError(null);

    if (!value.trim()) {
      setOutputText("");
      return;
    }

    try {
      if (mode === "encode") {
        setOutputText(encode(value));
      } else {
        setOutputText(decode(value));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setOutputText("");
    }
  };

  const handleModeChange = (newMode: "encode" | "decode") => {
    setMode(newMode);
    setError(null);

    if (!inputText.trim()) return;

    try {
      if (newMode === "encode") {
        setOutputText(encode(inputText));
      } else {
        setOutputText(decode(inputText));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setOutputText("");
    }
  };

  const handleFormatChange = (newFormat: BaseFormat) => {
    setBaseFormat(newFormat);
    setError(null);
  };

  const swapInputOutput = () => {
    const temp = inputText;
    setInputText(outputText);
    setOutputText(temp);
    setMode(mode === "encode" ? "decode" : "encode");
  };

  const clearAll = () => {
    setInputText("");
    setOutputText("");
    setError(null);
    setFileInfo(null);
    setFileResult(null);
    setProgress(0);
  };

  // File handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
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
      // Get chunk alignment based on format (to ensure proper encoding boundaries)
      const getChunkAlignment = (format: BaseFormat): number => {
        switch (format) {
          case "base16": return 1; // Each byte is independent
          case "base32": return 5; // 5 bytes -> 8 chars
          case "base64": return 3; // 3 bytes -> 4 chars
          case "base64url": return 3;
          case "ascii85": return 4; // 4 bytes -> 5 chars
          default: return 1;
        }
      };

      const alignment = getChunkAlignment(baseFormat);
      const BASE_CHUNK = 1024 * 1024; // ~1MB base
      const CHUNK_SIZE = Math.floor(BASE_CHUNK / alignment) * alignment;

      // For ASCII85, chunking is complex due to 'z' shorthand, so process entire file
      const canStreamChunks = baseFormat !== "ascii85";

      if (file.size > CHUNK_SIZE * 10 && canStreamChunks) {
        // Stream large files in chunks
        const chunks: string[] = [];
        let offset = 0;

        while (offset < file.size) {
          const chunk = file.slice(offset, offset + CHUNK_SIZE);
          const arrayBuffer = await chunk.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          chunks.push(encodeBytesToFormat(bytes, baseFormat));

          offset += CHUNK_SIZE;
          setProgress(Math.min((offset / file.size) * 100, 100));

          // Small delay to allow UI updates
          await new Promise((r) => setTimeout(r, 0));
        }

        setFileResult(chunks.join(""));
      } else {
        // Small files or ASCII85 - process entire file at once
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setFileResult(encodeBytesToFormat(bytes, baseFormat));
        setProgress(100);
      }
    } catch {
      setError("Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDecoded = () => {
    if (!inputText.trim()) return;

    try {
      let bytes: Uint8Array;

      // Decode the encoded data back to binary
      if (baseFormat === "base64" || baseFormat === "base64url") {
        // For base64, decode directly to binary
        const decoded = decode(inputText);
        bytes = new TextEncoder().encode(decoded);
      } else {
        // For other formats, decode to string first, then to bytes
        const decoded = decode(inputText);
        bytes = new TextEncoder().encode(decoded);
      }

      const blob = new Blob([bytes] as BlobPart[]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "decoded-file";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download decoded file");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">File</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Mode & Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Tabs
                value={mode}
                onValueChange={(v) =>
                  handleModeChange(v as "encode" | "decode")
                }
              >
                <TabsList>
                  <TabsTrigger value="encode">Encode</TabsTrigger>
                  <TabsTrigger value="decode">Decode</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select
                value={baseFormat}
                onValueChange={(v) => handleFormatChange(v as BaseFormat)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base16">Base16 (Hex)</SelectItem>
                  <SelectItem value="base32">Base32</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                  <SelectItem value="base64url">Base64URL</SelectItem>
                  <SelectItem value="ascii85">ASCII85</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={swapInputOutput}>
                <ArrowDownUp className="w-4 h-4 mr-2" />
                Swap
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Input/Output Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Input</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Textarea
                  placeholder={
                    mode === "encode"
                      ? "Enter text to encode..."
                      : `Enter ${baseFormat.toUpperCase()} to decode...`
                  }
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="font-mono text-sm h-full min-h-48 resize-none"
                />
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Output</CardTitle>
                  {outputText && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyWithAnimation(outputText)}
                      className={copyAnimationClass}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
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
                    value={outputText}
                    readOnly
                    className="font-mono text-sm h-full min-h-48 resize-none"
                    placeholder="Result will appear here..."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          {(inputText || outputText) && (
            <Card>
              <CardContent className="py-3">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Input: </span>
                    <span className="font-mono">{inputText.length} chars</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <span className="font-mono">{outputText.length} chars</span>
                  </div>
                  {mode === "encode" && outputText && (
                    <div>
                      <span className="text-muted-foreground">Expansion: </span>
                      <span className="font-mono">
                        {((outputText.length / inputText.length) * 100).toFixed(
                          0,
                        )}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="file" className="flex-1 flex flex-col gap-4 mt-4">
          {/* File Drop Zone */}
          <Card
            className={cn(
              "flex-1 border-2 border-dashed transition-colors",
              isDragging && "border-primary bg-primary/5",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-64 gap-4">
              {!fileInfo ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Drop a file here to encode</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse - supports large files via streaming
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
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
                        Processing... {progress.toFixed(0)}%
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
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Another
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
                      {baseFormat.toUpperCase()} Output
                    </CardTitle>
                    <CardDescription>
                      {fileResult.length.toLocaleString()} characters
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyWithAnimation(fileResult)}
                    className={copyAnimationClass}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={
                    fileResult.slice(0, 5000) +
                    (fileResult.length > 5000
                      ? "\n\n... (truncated for display)"
                      : "")
                  }
                  readOnly
                  className="font-mono text-xs h-32"
                />
              </CardContent>
            </Card>
          )}

          {/* Decode Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Decode {baseFormat.toUpperCase()} to File
              </CardTitle>
              <CardDescription>
                Paste {baseFormat.toUpperCase()} encoded data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Paste ${baseFormat.toUpperCase()} encoded data...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="font-mono text-sm min-h-24"
              />
              <Button onClick={downloadDecoded} disabled={!inputText}>
                <Download className="w-4 h-4 mr-2" />
                Download Decoded File
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
