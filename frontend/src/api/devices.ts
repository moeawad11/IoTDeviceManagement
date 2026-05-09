import axios from "axios";
import type { Device, DeviceStatus, DevicesResponse } from "../types/device";
import { API_CONFIG, TENANT_ID_HEADER, DEFAULT_TENANT_ID } from "../constants";

export type {
  DeviceType,
  DeviceStatus,
  Device,
  DevicesResponse,
} from "../types/device";

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    ...API_CONFIG.HEADERS,
    [TENANT_ID_HEADER]: import.meta.env.VITE_TENANT_ID ?? DEFAULT_TENANT_ID,
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
