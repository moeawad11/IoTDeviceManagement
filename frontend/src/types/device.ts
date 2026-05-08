export type DeviceType = "ESP32" | "GATEWAY" | "SENSOR" | "PLC";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR";

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  type: DeviceType;
  status: DeviceStatus;
  tenantId: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DevicesResponse {
  data: Device[];
  total: number;
  page: number;
  limit: number;
}
