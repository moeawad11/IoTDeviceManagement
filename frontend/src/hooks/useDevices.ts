import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/devices";
import type { DeviceStatus } from "../api/devices";

export const DEVICES_KEY = "devices";

export function useDevices(filters?: {
  status?: DeviceStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [DEVICES_KEY, filters],
    queryFn: () => devicesApi.getAll(filters),
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeviceStatus }) =>
      devicesApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] }),
  });
}
