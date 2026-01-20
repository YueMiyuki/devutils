import type React from "react";
import {
  Activity,
  Binary,
  Braces,
  CalendarClock,
  FileJson,
  FileText,
  Fish,
  GitBranch,
  Hash,
  Key,
  Pipette,
  RadioTower,
  Rocket,
  Shield,
  Syringe,
  TableProperties,
  Terminal,
  Clock,
  QrCode,
  Scissors,
} from "lucide-react";

export type ToolId =
  | "ascii-cork"
  | "base64"
  | "blame-intern"
  | "boss-mode"
  | "color-picker"
  | "cron-generator"
  | "curl-converter"
  | "deploy-roulette"
  | "hash-generator"
  | "json-csv"
  | "jwt-decoder"
  | "jwt-toothpick"
  | "lorem-tweezers"
  | "port-detective"
  | "qr-code"
  | "regex-tester"
  | "ssl-toothbrush"
  | "tcp-whistle"
  | "timestamp-converter"
  | "websocket-fish";

export const TOOL_TRANSLATIONS: Record<ToolId, string> = {
  "ascii-cork": "tools.asciiCork.name",
  base64: "tools.base64.name",
  "blame-intern": "tools.blameIntern.name",
  "boss-mode": "tools.bossMode.name",
  "color-picker": "tools.colorPicker.name",
  "cron-generator": "tools.cronGenerator.name",
  "curl-converter": "tools.curlConverter.name",
  "deploy-roulette": "tools.deployRoulette.name",
  "hash-generator": "tools.hashGenerator.name",
  "json-csv": "tools.jsonCsv.name",
  "jwt-decoder": "tools.jwtDecoder.name",
  "jwt-toothpick": "tools.jwtToothpick.name",
  "lorem-tweezers": "tools.loremTweezers.name",
  "port-detective": "tools.portDetective.name",
  "qr-code": "tools.qrCode.name",
  "regex-tester": "tools.regexTester.name",
  "ssl-toothbrush": "tools.sslToothbrush.name",
  "tcp-whistle": "tools.tcpWhistle.name",
  "timestamp-converter": "tools.timestampConverter.name",
  "websocket-fish": "tools.websocketFish.name",
};

export const TOOL_ICONS: Record<
  ToolId,
  React.ComponentType<{ className?: string }>
> = {
  "ascii-cork": Braces,
  base64: Binary,
  "blame-intern": GitBranch,
  "boss-mode": TableProperties,
  "color-picker": Pipette,
  "cron-generator": CalendarClock,
  "curl-converter": Terminal,
  "deploy-roulette": Rocket,
  "hash-generator": Hash,
  "json-csv": FileJson,
  "jwt-decoder": Key,
  "jwt-toothpick": Syringe,
  "lorem-tweezers": FileText,
  "port-detective": Activity,
  "qr-code": QrCode,
  "regex-tester": Scissors,
  "ssl-toothbrush": Shield,
  "tcp-whistle": RadioTower,
  "timestamp-converter": Clock,
  "websocket-fish": Fish,
};

export const UTILITY_TOOLS: ToolId[] = [
  "ascii-cork",
  "base64",
  "color-picker",
  "cron-generator",
  "curl-converter",
  "hash-generator",
  "json-csv",
  "jwt-decoder",
  "jwt-toothpick",
  "port-detective",
  "qr-code",
  "regex-tester",
  "ssl-toothbrush",
  "tcp-whistle",
  "timestamp-converter",
  "websocket-fish",
  "lorem-tweezers",
];

export const FUN_TOOLS: ToolId[] = [
  "blame-intern",
  "deploy-roulette",
  "boss-mode",
];
