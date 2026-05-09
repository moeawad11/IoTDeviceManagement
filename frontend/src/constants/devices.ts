import type { DeviceStatus } from "../types/device";

export const DEVICE_STATUSES: readonly DeviceStatus[] = [
  "ONLINE",
  "OFFLINE",
  "ERROR",
];

export const STATUS_FILTER_OPTIONS: Array<DeviceStatus | "ALL"> = [
  "ALL",
  "ONLINE",
  "OFFLINE",
  "ERROR",
];

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  ONLINE: "bg-green-100 text-green-800",
  OFFLINE: "bg-gray-100 text-gray-700",
  ERROR: "bg-red-100 text-red-700",
};

export const DEVICE_TYPES = ["ESP32", "GATEWAY", "SENSOR", "PLC"] as const;

export const DEFAULT_PAGE_SIZE = 20;
