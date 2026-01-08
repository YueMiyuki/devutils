"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Copy,
  ArrowRight,
  Trash2,
  Wand2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";

type DataFormat = "json" | "csv" | "tsv" | "xml" | "yaml";

interface DataConverterProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DataConverter({ tabId: _tabId }: DataConverterProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [sourceFormat, setSourceFormat] = useState<DataFormat>("json");
  const [targetFormat, setTargetFormat] = useState<DataFormat>("csv");
  const [error, setError] = useState<string | null>(null);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [fixApplied, setFixApplied] = useState(false);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  // JSON Auto-fix
  const autoFixJson = (input: string): string => {
    let fixed = input.trim();

    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    fixed = fixed.replace(/'/g, '"');

    fixed = fixed.replace(/,\s*([}\]])/g, "$1");

    fixed = fixed.replace(/}(\s*){/g, "},$1{");
    fixed = fixed.replace(/](\s*)\[/g, "],$1[");

    // Try to add missing closing brackets
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += "}";
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += "]";
    }

    return fixed;
  };

  // Parse functions
  const parseJson = useCallback(
    (input: string): unknown => {
      try {
        return JSON.parse(input);
      } catch {
        if (autoFixEnabled) {
          const fixed = autoFixJson(input);
          try {
            const result = JSON.parse(fixed);
            setFixApplied(true);
            return result;
          } catch {
            throw new Error("Invalid JSON - auto-fix could not repair");
          }
        }
        throw new Error("Invalid JSON");
      }
    },
    [autoFixEnabled],
  );

  const parseCSVLine = (line: string, delimiter = ","): string[] => {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let wasQuoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
          wasQuoted = true;
        }
      } else if (char === delimiter && !inQuotes) {
        // Only trim unquoted fields; preserve whitespace in quoted fields
        fields.push(wasQuoted ? currentField : currentField.trim());
        currentField = "";
        wasQuoted = false;
      } else {
        currentField += char;
      }
    }

    // Only trim unquoted fields; preserve whitespace in quoted fields
    fields.push(wasQuoted ? currentField : currentField.trim());
    return fields;
  };

  const parseCsv = (input: string, delimiter = ","): unknown[] => {
    const lines = input.trim().split("\n");
    if (lines.length < 1) throw new Error("Empty CSV");

    const headers = parseCSVLine(lines[0], delimiter);
    const result: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], delimiter);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      result.push(row);
    }

    return result;
  };

  const parseXml = (input: string): unknown => {
    // Simple XML parser for basic structures
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "text/xml");

    // Check for parse errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      const errorText =
        parserError.textContent || doc.documentElement.innerHTML;
      throw new Error(`Invalid XML: ${errorText}`);
    }

    const parseNode = (node: Element): unknown => {
      const result: Record<string, unknown> = {};

      // Handle attributes
      Array.from(node.attributes).forEach((attr) => {
        result[`@${attr.name}`] = attr.value;
      });

      // Handle children
      const children = Array.from(node.children);
      if (children.length === 0) {
        return node.textContent?.trim() || result;
      }

      children.forEach((child) => {
        const childName = child.tagName;
        const childValue = parseNode(child);

        if (result[childName]) {
          if (Array.isArray(result[childName])) {
            (result[childName] as unknown[]).push(childValue);
          } else {
            result[childName] = [result[childName], childValue];
          }
        } else {
          result[childName] = childValue;
        }
      });

      return result;
    };

    return parseNode(doc.documentElement);
  };

  const parseYaml = (input: string): unknown => {
    // Simple YAML parser for basic structures
    const lines = input.split("\n");
    const result: Record<string, unknown> = {};
    let currentKey = "";
    let inArray = false;
    let arrayKey = "";
    let arrayItems: unknown[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const arrayMatch = trimmed.match(/^-\s*(.*)$/);
      const keyValueMatch = trimmed.match(/^([^:]+):\s*(.*)$/);

      if (arrayMatch) {
        if (!inArray) {
          inArray = true;
          arrayKey = currentKey;
          arrayItems = [];
        }
        arrayItems.push(arrayMatch[1] || "");
      } else if (keyValueMatch) {
        if (inArray && arrayKey) {
          result[arrayKey] = arrayItems;
          inArray = false;
          arrayItems = [];
        }

        const [, key, value] = keyValueMatch;
        currentKey = key.trim();
        if (value) {
          result[currentKey] = value.trim().replace(/^["']|["']$/g, "");
        }
      }
    }

    if (inArray && arrayKey) {
      result[arrayKey] = arrayItems;
    }

    return result;
  };

  // Convert functions
  const toJson = (data: unknown): string => {
    return JSON.stringify(data, null, 2);
  };

  const toCsv = (data: unknown, delimiter = ","): string => {
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) return "";

    // Flatten nested objects and collect all unique keys
    const flattenObject = (
      obj: Record<string, unknown>,
      prefix = "",
    ): Record<string, string> => {
      const flattened: Record<string, string> = {};

      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          flattened[fullKey] = "";
        } else if (typeof value === "object" && !Array.isArray(value)) {
          Object.assign(
            flattened,
            flattenObject(value as Record<string, unknown>, fullKey),
          );
        } else if (Array.isArray(value)) {
          flattened[fullKey] = JSON.stringify(value);
        } else {
          flattened[fullKey] = String(value);
        }
      });

      return flattened;
    };

    // Flatten all rows
    const flattenedRows = arr.map((row) =>
      flattenObject(row as Record<string, unknown>),
    );

    // Get all unique headers
    const allHeaders = new Set<string>();
    flattenedRows.forEach((row) => {
      Object.keys(row).forEach((key) => allHeaders.add(key));
    });
    const headers = Array.from(allHeaders);

    // Build CSV rows
    const rows = flattenedRows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val);
          return str.includes(delimiter) ||
            str.includes('"') ||
            str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(delimiter),
    );

    return [headers.join(delimiter), ...rows].join("\n");
  };

  const toXml = (data: unknown, rootName = "root"): string => {
    const escapeXml = (str: string): string => {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const buildXml = (obj: unknown, name: string, indent = ""): string => {
      if (obj === null || obj === undefined) {
        return `${indent}<${name}/>\n`;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => buildXml(item, name, indent)).join("");
      }

      if (typeof obj === "object") {
        const entries = Object.entries(obj as Record<string, unknown>);
        const attrs = entries
          .filter(([k]) => k.startsWith("@"))
          .map(([k, v]) => ` ${k.slice(1)}="${escapeXml(String(v))}"`)
          .join("");
        const children = entries
          .filter(([k]) => !k.startsWith("@"))
          .map(([k, v]) => buildXml(v, k, indent + "  "))
          .join("");

        if (children) {
          return `${indent}<${name}${attrs}>\n${children}${indent}</${name}>\n`;
        }
        return `${indent}<${name}${attrs}/>\n`;
      }

      return `${indent}<${name}>${escapeXml(String(obj))}</${name}>\n`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${buildXml(data, rootName)}`;
  };

  const toYaml = (data: unknown, indent = 0): string => {
    const spaces = "  ".repeat(indent);

    if (data === null || data === undefined) {
      return "null";
    }

    if (Array.isArray(data)) {
      if (data.length === 0) return "[]";
      return data
        .map((item) => `${spaces}- ${toYaml(item, indent + 1).trim()}`)
        .join("\n");
    }

    if (typeof data === "object") {
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0) return "{}";

      return entries
        .map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
          }
          return `${spaces}${key}: ${toYaml(value, indent)}`;
        })
        .join("\n");
    }

    if (typeof data === "string") {
      // YAML special characters that require quoting:
      // : # [ ] { } & * ! @ ` | > - ? , newlines, leading/trailing spaces
      const needsQuoting =
        data.includes("\n") ||
        data.includes(":") ||
        data.includes("#") ||
        data.includes("[") ||
        data.includes("]") ||
        data.includes("{") ||
        data.includes("}") ||
        data.includes("&") ||
        data.includes("*") ||
        data.includes("!") ||
        data.includes("|") ||
        data.includes(">") ||
        data.includes("@") ||
        data.includes("`") ||
        data.startsWith("-") ||
        data.startsWith("?") ||
        data.startsWith(",") ||
        data !== data.trim();

      if (needsQuoting) {
        return `"${data.replace(/"/g, '\\"')}"`;
      }
      return data;
    }

    return String(data);
  };

  // Main conversion
  const convert = useCallback(() => {
    setError(null);
    setFixApplied(false);

    if (!inputText.trim()) {
      setOutputText("");
      return;
    }

    try {
      // Parse input
      let data: unknown;
      switch (sourceFormat) {
        case "json":
          data = parseJson(inputText);
          break;
        case "csv":
          data = parseCsv(inputText, ",");
          break;
        case "tsv":
          data = parseCsv(inputText, "\t");
          break;
        case "xml":
          data = parseXml(inputText);
          break;
        case "yaml":
          data = parseYaml(inputText);
          break;
      }

      // Convert to output
      let output: string;
      switch (targetFormat) {
        case "json":
          output = toJson(data);
          break;
        case "csv":
          output = toCsv(data, ",");
          break;
        case "tsv":
          output = toCsv(data, "\t");
          break;
        case "xml":
          output = toXml(data);
          break;
        case "yaml":
          output = toYaml(data);
          break;
      }

      setOutputText(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setOutputText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, sourceFormat, targetFormat, autoFixEnabled]);

  // Auto-convert when input changes
  useEffect(() => {
    if (inputText.trim()) {
      convert();
    } else {
      setOutputText("");
      setError(null);
    }
  }, [inputText, convert]);

  const handleInputChange = (value: string) => {
    setInputText(value);
  };

  const clearAll = () => {
    setInputText("");
    setOutputText("");
    setError(null);
    setFixApplied(false);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">
                {t("tools.jsonCsv.from")}
              </Label>
              <Select
                value={sourceFormat}
                onValueChange={(v: DataFormat) => setSourceFormat(v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="tsv">TSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">
                {t("tools.jsonCsv.to")}
              </Label>
              <Select
                value={targetFormat}
                onValueChange={(v: DataFormat) => setTargetFormat(v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="tsv">TSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="auto-fix"
                checked={autoFixEnabled}
                onCheckedChange={setAutoFixEnabled}
              />
              <Label htmlFor="auto-fix" className="text-sm cursor-pointer">
                {t("tools.jsonCsv.autoFix")}
              </Label>
            </div>

            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("tools.jsonCsv.clear")}
            </Button>

            <Button size="sm" onClick={convert}>
              <Wand2 className="w-4 h-4 mr-2" />
              {t("tools.jsonCsv.convert")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      {(error || fixApplied) && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm",
            error
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {error ? (
            <>
              <XCircle className="w-4 h-4" />
              {error}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t("tools.jsonCsv.autoFixSuccess")}
            </>
          )}
        </div>
      )}

      {/* Input/Output Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {t("tools.jsonCsv.input")}
              <Badge variant="secondary">{sourceFormat.toUpperCase()}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Textarea
              placeholder={t("tools.jsonCsv.inputPlaceholder", {
                format: sourceFormat.toUpperCase(),
              })}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              className="font-mono text-sm h-full min-h-64 resize-none"
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {t("tools.jsonCsv.output")}
                <Badge variant="secondary">{targetFormat.toUpperCase()}</Badge>
              </CardTitle>
              {outputText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyWithAnimation(outputText)}
                  className={copyAnimationClass}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t("tools.jsonCsv.copy")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <Textarea
              value={outputText}
              readOnly
              className="font-mono text-sm h-full min-h-64 resize-none"
              placeholder={t("tools.jsonCsv.outputPlaceholder")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
