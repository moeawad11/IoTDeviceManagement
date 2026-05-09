export const API_CONFIG = {
  BASE_URL: "/devices",
  TIMEOUT: 10000,
  HEADERS: {
    "Content-Type": "application/json",
  },
} as const;

export const TENANT_ID_HEADER = "x-tenant-id";
export const DEFAULT_TENANT_ID = "tenant-demo";
