import axios from "axios";
import type { Device, DeviceStatus, DevicesResponse } from "../types/device";

export type {
  DeviceType,
  DeviceStatus,
  Device,
  DevicesResponse,
} from "../types/device";

const api = axios.create({
  baseURL: "/devices",
  headers: {
    "Content-Type": "application/json",
    // In production this would come from auth context / JWT
    "x-tenant-id": import.meta.env.VITE_TENANT_ID ?? "tenant-demo",
  },
});

export const devicesApi = {
  getAll: (params?: { status?: DeviceStatus; page?: number; limit?: number }) =>
    api.get<DevicesResponse>("/", { params }).then((r) => r.data),

  getOne: (id: string) => api.get<Device>(`/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: DeviceStatus) =>
    api.patch<Device>(`/${id}/status`, { status }).then((r) => r.data),

  delete: (id: string) => api.delete(`/${id}`),
};
