import type { Device, DeviceStatus } from "../../types/device";

const STATUS_STYLES: Record<DeviceStatus, string> = {
  ONLINE: "bg-green-100 text-green-800",
  OFFLINE: "bg-gray-100 text-gray-700",
  ERROR: "bg-red-100 text-red-700",
};

interface Props {
  device: Device;
  onView: (device: Device) => void;
  onDisable: (device: Device) => void;
  isDisabling?: boolean;
}

export function DeviceRow({ device, onView, onDisable, isDisabling }: Props) {
  const lastSeen = device.lastSeenAt
    ? new Date(device.lastSeenAt).toLocaleString()
    : "—";

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-900">{device.name}</td>
      <td className="px-4 py-3 text-gray-600 font-mono text-sm">
        {device.serialNumber}
      </td>
      <td className="px-4 py-3 text-gray-600">{device.type}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[device.status]}`}
        >
          {device.status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-sm">{lastSeen}</td>
      <td className="px-4 py-3 flex gap-2">
        <button
          onClick={() => onView(device)}
          className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          aria-label={`View device ${device.name}`}
        >
          View
        </button>
        <button
          onClick={() => onDisable(device)}
          disabled={device.status === "OFFLINE" || isDisabling}
          className="text-sm px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Disable device ${device.name}`}
        >
          Disable
        </button>
      </td>
    </tr>
  );
}
