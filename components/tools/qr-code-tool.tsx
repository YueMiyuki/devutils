"use client";

import type React from "react";

import { useState, useCallback, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Trash2,
  Download,
  Upload,
  QrCode as QrCodeIcon,
  Wifi,
  User,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import jsQR from "jsqr";
import Image from "next/image";

type QRType = "text" | "url" | "wifi" | "vcard" | "json";

interface QRCodeToolProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QRCodeTool({ tabId: _tabId }: QRCodeToolProps) {
  const { t } = useTranslation();
  const [qrType, setQrType] = useState<QRType>("text");
  const [qrData, setQrData] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">(
    "WPA",
  );
  const [wifiHidden, setWifiHidden] = useState(false);
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [vcardOrg, setVcardOrg] = useState("");
  const [vcardUrl, setVcardUrl] = useState("");
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { copyWithAnimation, copyAnimationClass } = useCopyAnimation();

  const escapeWifiString = (str: string): string => {
    // WiFi QR format requires escaping of special characters
    // See: https://en.wikipedia.org/wiki/QR_code#WiFi
    return str
      .replace(/\\/g, "\\\\") // backslash first
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/:/g, "\\:")
      .replace(/"/g, '\\"');
  };

  const escapeVCardField = (str: string): string => {
    // vCard format requires escaping of special characters
    // See: https://datatracker.ietf.org/doc/html/rfc6350
    return str
      .replace(/\\/g, "\\\\") // backslash first
      .replace(/\n/g, "\\n") // newline
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  };

  const handleJsonChange = (value: string) => {
    setJsonData(value);
    if (value.trim()) {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (err) {
        setJsonError(
          err instanceof Error
            ? err.message
            : t("tools.qrCode.errors.invalidJson"),
        );
      }
    } else {
      setJsonError(null);
    }
  };

  const formatJson = () => {
    if (!jsonData.trim()) return;
    try {
      const parsed = JSON.parse(jsonData);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonData(formatted);
      setJsonError(null);
      toast.success(t("tools.qrCode.success.jsonFormatted"));
    } catch (err) {
      setJsonError(
        err instanceof Error
          ? err.message
          : t("tools.qrCode.errors.invalidJson"),
      );
    }
  };

  const generateQRData = useCallback(() => {
    switch (qrType) {
      case "text":
      case "url":
        return qrData;
      case "json":
        return jsonData;
      case "wifi":
        return `WIFI:T:${wifiSecurity};S:${escapeWifiString(wifiSsid)};P:${escapeWifiString(wifiPassword)};H:${wifiHidden};`;
      case "vcard":
        return `BEGIN:VCARD
VERSION:3.0
FN:${escapeVCardField(vcardName)}
TEL:${escapeVCardField(vcardPhone)}
EMAIL:${escapeVCardField(vcardEmail)}
ORG:${escapeVCardField(vcardOrg)}
URL:${escapeVCardField(vcardUrl)}
END:VCARD`;
      default:
        return "";
    }
  }, [
    qrType,
    qrData,
    jsonData,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    wifiHidden,
    vcardName,
    vcardPhone,
    vcardEmail,
    vcardOrg,
    vcardUrl,
  ]);

  const generateQRCode = useCallback(async () => {
    const data = generateQRData();
    if (!data.trim()) {
      setError(t("tools.qrCode.errors.emptyData"));
      setQrImage(null);
      return;
    }

    // Validate JSON
    if (qrType === "json") {
      try {
        JSON.parse(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("tools.qrCode.errors.invalidJson"),
        );
        setQrImage(null);
        return;
      }
    }

    try {
      setError(null);
      const qrDataUrl = await QRCode.toDataURL(data, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setQrImage(qrDataUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.qrCode.errors.generateFailed"),
      );
      setQrImage(null);
    }
  }, [generateQRData, qrType, t]);

  const handleTypeChange = (newType: QRType) => {
    setQrType(newType);
    setError(null);
    setQrImage(null);
  };

  const clearAll = () => {
    setQrData("");
    setQrImage(null);
    setError(null);
    setJsonData("");
    setJsonError(null);
    setWifiSsid("");
    setWifiPassword("");
    setWifiSecurity("WPA");
    setWifiHidden(false);
    setVcardName("");
    setVcardPhone("");
    setVcardEmail("");
    setVcardOrg("");
    setVcardUrl("");
  };

  const downloadQRCode = () => {
    if (!qrImage) return;

    const a = document.createElement("a");
    a.href = qrImage;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
    toast.success(t("tools.qrCode.success.downloaded"));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = document.createElement("img");
      const reader = new FileReader();

      reader.onload = (event) => {
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            setScannedResult(code.data);
            setError(null);
            toast.success(t("tools.qrCode.success.scanned"));
          } else {
            setError(t("tools.qrCode.errors.noQRFound"));
            setScannedResult(null);
          }
        };

        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.qrCode.errors.scanFailed"),
      );
      setScannedResult(null);
    }
  };

  const clearScanner = () => {
    setScannedResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Tabs defaultValue="generate" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="generate">
            {t("tools.qrCode.generateTab")}
          </TabsTrigger>
          <TabsTrigger value="scan">{t("tools.qrCode.scanTab")}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="generate"
          className="flex-1 flex flex-col gap-4 mt-4"
        >
          {/* QR Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.qrCode.selectType")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={qrType}
                onValueChange={(v) => handleTypeChange(v as QRType)}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label
                    htmlFor="text"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    {t("tools.qrCode.types.text")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="url" />
                  <Label
                    htmlFor="url"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <QrCodeIcon className="w-4 h-4" />
                    {t("tools.qrCode.types.url")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label
                    htmlFor="json"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    {t("tools.qrCode.types.json")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wifi" id="wifi" />
                  <Label
                    htmlFor="wifi"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Wifi className="w-4 h-4" />
                    {t("tools.qrCode.types.wifi")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vcard" id="vcard" />
                  <Label
                    htmlFor="vcard"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    {t("tools.qrCode.types.vcard")}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Input Fields */}
          {(qrType === "text" || qrType === "url") && (
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {qrType === "text"
                    ? t("tools.qrCode.textInput")
                    : t("tools.qrCode.urlInput")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={
                    qrType === "text"
                      ? t("tools.qrCode.textPlaceholder")
                      : t("tools.qrCode.urlPlaceholder")
                  }
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  className="font-mono text-sm h-full min-h-48 resize-none"
                />
              </CardContent>
            </Card>
          )}

          {qrType === "json" && (
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("tools.qrCode.jsonInput")}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={formatJson}
                    disabled={!jsonData.trim() || !!jsonError}
                  >
                    {t("tools.qrCode.formatJson")}
                  </Button>
                </div>
                <CardDescription>
                  {t("tools.qrCode.jsonInputDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder={t("tools.qrCode.jsonPlaceholder")}
                  value={jsonData}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-sm h-full min-h-48 resize-none"
                />
                {jsonError && (
                  <div className="p-2 bg-destructive/10 rounded-md text-destructive text-xs">
                    {jsonError}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {qrType === "wifi" && (
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.qrCode.wifiConfig")}
                </CardTitle>
                <CardDescription>
                  {t("tools.qrCode.wifiConfigDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.wifi.ssid")}</Label>
                  <Input
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder={t("tools.qrCode.wifi.ssidPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.wifi.password")}</Label>
                  <Input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder={t("tools.qrCode.wifi.passwordPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.wifi.security")}</Label>
                  <Select
                    value={wifiSecurity}
                    onValueChange={(v) =>
                      setWifiSecurity(v as "WPA" | "WEP" | "nopass")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WPA">WPA/WPA2</SelectItem>
                      <SelectItem value="WEP">WEP</SelectItem>
                      <SelectItem value="nopass">
                        {t("tools.qrCode.wifi.noPassword")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hidden"
                    checked={wifiHidden}
                    onChange={(e) => setWifiHidden(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="hidden" className="cursor-pointer">
                    {t("tools.qrCode.wifi.hidden")}
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {qrType === "vcard" && (
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.qrCode.vcardInfo")}
                </CardTitle>
                <CardDescription>
                  {t("tools.qrCode.vcardInfoDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.vcard.name")}</Label>
                  <Input
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    placeholder={t("tools.qrCode.vcard.namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.vcard.phone")}</Label>
                  <Input
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder={t("tools.qrCode.vcard.phonePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.vcard.email")}</Label>
                  <Input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder={t("tools.qrCode.vcard.emailPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.vcard.organization")}</Label>
                  <Input
                    value={vcardOrg}
                    onChange={(e) => setVcardOrg(e.target.value)}
                    placeholder={t(
                      "tools.qrCode.vcard.organizationPlaceholder",
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tools.qrCode.vcard.website")}</Label>
                  <Input
                    value={vcardUrl}
                    onChange={(e) => setVcardUrl(e.target.value)}
                    placeholder={t("tools.qrCode.vcard.websitePlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={generateQRCode} size="sm">
              <QrCodeIcon className="w-4 h-4 mr-2" />
              {t("tools.qrCode.generate")}
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("tools.qrCode.clear")}
            </Button>
          </div>

          {/* QR Code Output */}
          {error && (
            <Card>
              <CardContent className="py-4">
                <div className="p-4 bg-destructive/10 rounded-md text-destructive text-sm">
                  {error}
                </div>
              </CardContent>
            </Card>
          )}

          {qrImage && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("tools.qrCode.qrCodeOutput")}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyWithAnimation(generateQRData())}
                      className={copyAnimationClass}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {t("tools.qrCode.copyData")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadQRCode}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("tools.qrCode.download")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Image
                  src={qrImage}
                  alt="QR Code"
                  width={400}
                  height={400}
                  className="border rounded-lg shadow-md"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scan" className="flex-1 flex flex-col gap-4 mt-4">
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.qrCode.scanQRCode")}
              </CardTitle>
              <CardDescription>
                {t("tools.qrCode.scanDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("tools.qrCode.selectImage")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 rounded-md text-destructive text-sm">
                  {error}
                </div>
              )}

              {scannedResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {t("tools.qrCode.scannedResult")}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyWithAnimation(scannedResult)}
                          className={copyAnimationClass}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {t("tools.qrCode.copy")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearScanner}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("tools.qrCode.clear")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={scannedResult}
                      readOnly
                      className="font-mono text-sm min-h-32"
                    />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Hidden canvas for QR code scanning */}
          <canvas ref={canvasRef} className="hidden" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
