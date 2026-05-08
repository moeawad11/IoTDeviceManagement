import { useState } from "react";
import { useDevices, useUpdateDeviceStatus } from "../../hooks/useDevices";
import type { Device, DeviceStatus } from "../../types/device";
import { DeviceRow } from "./DeviceRow";

const STATUS_OPTIONS: Array<DeviceStatus | "ALL"> = [
  "ALL",
  "ONLINE",
  "OFFLINE",
  "ERROR",
];

export function DeviceTable() {
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "ALL">("ALL");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const { data, isLoading, isError, error } = useDevices({
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const { mutate: updateStatus, isPending: isDisabling } =
    useUpdateDeviceStatus();

  const handleDisable = (device: Device) => {
    updateStatus({ id: device.id, status: "OFFLINE" });
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-40 text-gray-400"
        role="status"
      >
        Loading devices…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex items-center justify-center h-40 text-red-500"
        role="alert"
      >
        Failed to load devices: {(error as Error)?.message ?? "Unknown error"}
      </div>
    );
  }

  const devices = data?.data ?? [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">IoT Devices</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as DeviceStatus | "ALL")
            }
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {devices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No devices found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  onView={setSelectedDevice}
                  onDisable={handleDisable}
                  isDisabling={isDisabling}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination info */}
      {data && (
        <p className="mt-3 text-xs text-gray-400">
          Showing {devices.length} of {data.total} device(s)
        </p>
      )}

      {/* Simple view modal */}
      {selectedDevice && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Device details for ${selectedDevice.name}`}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              {selectedDevice.name}
            </h2>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["ID", selectedDevice.id],
                  ["Serial Number", selectedDevice.serialNumber],
                  ["Type", selectedDevice.type],
                  ["Status", selectedDevice.status],
                  ["Tenant", selectedDevice.tenantId],
                  [
                    "Last Seen",
                    selectedDevice.lastSeenAt
                      ? new Date(selectedDevice.lastSeenAt).toLocaleString()
                      : "—",
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900 text-right break-all">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => setSelectedDevice(null)}
              className="mt-5 w-full text-sm py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
