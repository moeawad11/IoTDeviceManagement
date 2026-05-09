import { useState } from "react";
import { useDevices, useUpdateDeviceStatus } from "../../hooks/useDevices";
import type { Device, DeviceStatus } from "../../types/device";
import { STATUS_FILTER_OPTIONS } from "../../constants";
import { DeviceRow } from "./DeviceRow";

export function DeviceTable() {
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const { data, isLoading, isError, error } = useDevices({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    limit: 20,
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">IoT Devices</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as DeviceStatus | "ALL");
              setPage(1);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No devices found.</div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full bg-white text-xs sm:text-sm">
            <thead className="bg-gray-50 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Name</th>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Serial Number</th>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Type</th>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Status</th>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Last Seen</th>
                <th className="px-2 sm:px-6 py-2 sm:py-4">Actions</th>
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

      {data && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-[10px] sm:text-sm text-gray-400">
            Page {data.page} of {Math.ceil(data.total / data.limit)} | Showing{" "}
            {devices.length} of {data.total} device(s)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page === 1}
              className="text-[10px] sm:text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((p) =>
                  Math.min(Math.ceil(data.total / data.limit), p + 1),
                )
              }
              disabled={data.page >= Math.ceil(data.total / data.limit)}
              className="text-[10px] sm:text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedDevice && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Device details for ${selectedDevice.name}`}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-11/12"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-6">
              {selectedDevice.name}
            </h2>
            <dl className="space-y-3 text-sm">
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
              className="mt-8 w-full text-sm py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors\"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
