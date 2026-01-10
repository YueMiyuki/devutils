"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  FileText,
  LocateFixed,
  Mail,
  RefreshCcw,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";

interface LoremTweezersProps {
  tabId: string;
}

type LengthPreset = "short" | "medium" | "long";
type CardBrand = "visa" | "mastercard" | "amex";

const words = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "developer",
  "runtime",
  "scalable",
  "microservice",
  "resilient",
  "observability",
  "circuit",
  "breaker",
  "latency",
  "edge",
  "cloud",
  "container",
  "deploy",
  "ship",
  "build",
  "iterate",
  "refactor",
  "optimize",
  "throughput",
];

const names = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Linus Torvalds",
  "Margaret Hamilton",
  "Ken Thompson",
  "Evelyn Boyd",
  "Guido Rossum",
];

const domains = ["example.com", "mail.test", "dev.local", "sandbox.dev"];
const streets = ["Maple", "Cedar", "Oak", "Pine", "Elm", "Sunset", "Riverside"];
const cities = ["Zurich", "Berlin", "Taipei", "Seattle", "Sydney", "Toronto"];
const regions = ["CA", "NY", "WA", "TX", "BC", "ZH"];

const ibanLengths: Record<string, number> = {
  DE: 22,
  GB: 22,
  FR: 27,
  NL: 18,
  ES: 24,
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSentence(targetWords: number): string {
  const count = Math.max(4, targetWords);
  const picked = Array.from({ length: count }, () => randomItem(words));
  const sentence =
    picked
      .join(" ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim() + ".";
  return sentence;
}

function generateParagraph(length: LengthPreset): string {
  const sentenceCount =
    length === "short"
      ? randomInt(2, 3)
      : length === "long"
        ? randomInt(5, 6)
        : randomInt(3, 4);
  const targetWords =
    length === "short"
      ? randomInt(5, 7)
      : length === "long"
        ? randomInt(10, 14)
        : randomInt(7, 10);
  return Array.from({ length: sentenceCount }, () =>
    generateSentence(targetWords),
  ).join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateEmail(): string {
  const name = randomItem(names);
  const slug = slugify(name).replace(/-/g, ".");
  const suffix = randomInt(10, 99);
  return `${slug}${suffix}@${randomItem(domains)}`;
}

function generateAddress(): string {
  const number = randomInt(10, 9999);
  const street = randomItem(streets);
  const line1 = `${number} ${street} ${randomItem(["St", "Ave", "Rd"])}`;
  const city = randomItem(cities);
  const region = randomItem(regions);
  const postal = `${randomInt(10000, 99999)}`;
  return `${line1}\n${city}, ${region} ${postal}`;
}

function luhnCheckDigit(number: string): number {
  const digits = number.split("").map((d) => parseInt(d, 10));
  let sum = 0;
  let doubleDigit = true;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return (10 - (sum % 10)) % 10;
}

function generateCard(brand: CardBrand): string {
  const config: Record<CardBrand, { prefixes: string[]; length: number }> = {
    visa: { prefixes: ["4"], length: 16 },
    mastercard: { prefixes: ["51", "52", "53", "54", "55"], length: 16 },
    amex: { prefixes: ["34", "37"], length: 15 },
  };

  const { prefixes, length } = config[brand];
  let base = randomItem(prefixes);
  while (base.length < length - 1) {
    base += randomInt(0, 9).toString();
  }
  const checkDigit = luhnCheckDigit(base);
  const full = `${base}${checkDigit}`;

  return full.replace(/(.{4})/g, "$1 ").trim();
}

function computeIbanCheckDigits(country: string, bban: string): string {
  const rearranged = `${bban}${country}00`;
  const expanded = rearranged.replace(/[A-Z]/g, (c) =>
    (c.charCodeAt(0) - 55).toString(),
  );
  let remainder = 0;
  for (const char of expanded) {
    remainder = (remainder * 10 + parseInt(char, 10)) % 97;
  }
  const check = 98 - remainder;
  return check.toString().padStart(2, "0");
}

function generateIban(country: string): string {
  const length = ibanLengths[country] ?? 22;
  const bbanLength = Math.max(8, length - 4);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let bban = "";
  for (let i = 0; i < bbanLength; i++) {
    bban += alphabet[randomInt(0, alphabet.length - 1)];
  }
  const checkDigits = computeIbanCheckDigits(country, bban);
  return `${country}${checkDigits}${bban}`.slice(0, length);
}

export function LoremTweezers({ tabId: _tabId }: LoremTweezersProps) {
  const { t } = useTranslation();
  void _tabId;
  const [paragraphs, setParagraphs] = useState(2);
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>("medium");
  const [loremText, setLoremText] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cardBrand, setCardBrand] = useState<CardBrand>("visa");
  const [cardNumber, setCardNumber] = useState("");
  const [ibanCountry, setIbanCountry] = useState("DE");
  const [ibanValue, setIbanValue] = useState("");
  const { copyWithAnimation } = useCopyAnimation();

  const regenerateLorem = () => {
    const paras = Array.from({ length: paragraphs }, () =>
      generateParagraph(lengthPreset),
    ).join("\n\n");
    setLoremText(paras);
  };

  const regenerateIdentity = () => {
    setEmail(generateEmail());
    setAddress(generateAddress());
    setCardNumber(generateCard(cardBrand));
    setIbanValue(generateIban(ibanCountry));
  };

  const regenerateAll = () => {
    regenerateLorem();
    regenerateIdentity();
  };

  useEffect(() => {
    regenerateLorem();
    regenerateIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lengthLabel = useMemo(
    () => ({
      short: t("tools.loremTweezers.length.short"),
      medium: t("tools.loremTweezers.length.medium"),
      long: t("tools.loremTweezers.length.long"),
    }),
    [t],
  );

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {t("tools.loremTweezers.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tools.loremTweezers.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={regenerateAll}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          {t("tools.loremTweezers.actions.refreshAll")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("tools.loremTweezers.text.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.loremTweezers.text.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("tools.loremTweezers.text.paragraphs")}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={paragraphs}
                  onChange={(e) =>
                    setParagraphs(
                      Math.min(8, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-20"
                />
              </div>
              <Select
                value={lengthPreset}
                onValueChange={(value: LengthPreset) => setLengthPreset(value)}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">{lengthLabel.short}</SelectItem>
                  <SelectItem value="medium">{lengthLabel.medium}</SelectItem>
                  <SelectItem value="long">{lengthLabel.long}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={regenerateLorem} className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t("tools.loremTweezers.actions.generate")}
              </Button>
            </div>
            <Textarea
              value={loremText}
              onChange={(e) => setLoremText(e.target.value)}
              className="min-h-[400px] font-mono text-xs"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => copyWithAnimation(loremText)}
              >
                <Copy className="w-4 h-4" />
                {t("tools.loremTweezers.actions.copy")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t("tools.loremTweezers.identity.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.loremTweezers.identity.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.loremTweezers.identity.email")}
                  </p>
                  <p className="font-mono text-sm break-all">{email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyWithAnimation(email)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.loremTweezers.identity.address")}
                  </p>
                  <p className="font-mono text-sm whitespace-pre-line">
                    {address}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyWithAnimation(address)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="w-4 h-4" />
                {t("tools.loremTweezers.payment.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.loremTweezers.payment.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={cardBrand}
                  onValueChange={(value: CardBrand) => {
                    setCardBrand(value);
                    setCardNumber(generateCard(value));
                  }}
                >
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">
                      {t("tools.loremTweezers.payment.brands.visa")}
                    </SelectItem>
                    <SelectItem value="mastercard">
                      {t("tools.loremTweezers.payment.brands.mastercard")}
                    </SelectItem>
                    <SelectItem value="amex">
                      {t("tools.loremTweezers.payment.brands.amex")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCardNumber(generateCard(cardBrand))}
                >
                  {t("tools.loremTweezers.actions.regenerate")}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.loremTweezers.payment.cardNumber")}
                  </p>
                  <p className="font-mono text-sm">{cardNumber}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyWithAnimation(cardNumber)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={ibanCountry}
                  onValueChange={(value: string) => {
                    setIbanCountry(value);
                    setIbanValue(generateIban(value));
                  }}
                >
                  <SelectTrigger size="sm" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ibanLengths).map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIbanValue(generateIban(ibanCountry))}
                >
                  {t("tools.loremTweezers.actions.regenerate")}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.loremTweezers.payment.iban")}
                  </p>
                  <p className="font-mono text-sm break-all">{ibanValue}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyWithAnimation(ibanValue)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <LocateFixed className="w-4 h-4" />
                {t("tools.loremTweezers.meta.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.loremTweezers.meta.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("tools.loremTweezers.meta.note1")}</p>
              <p>{t("tools.loremTweezers.meta.note2")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
