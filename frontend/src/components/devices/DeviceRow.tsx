import type { Device } from "../../types/device";
import { STATUS_COLORS } from "../../constants";

interface Props {
  device: Device;
  onView: (device: Device) => void;
  onEnable: (device: Device) => void;
  onDisable: (device: Device) => void;
}

export function DeviceRow({ device, onView, onDisable, onEnable }: Props) {
  const lastSeen = device.lastSeenAt
    ? new Date(device.lastSeenAt).toLocaleString()
    : "—";

  const isEnabled = device.status === "ONLINE" || device.status === "OFFLINE";

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-2 sm:px-6 py-2 sm:py-4 font-medium text-gray-900 text-xs sm:text-sm">
        {device.name}
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600 font-mono text-xs sm:text-sm">
        {device.serialNumber}
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600 text-xs sm:text-sm">
        {device.type}
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4">
        <span
          className={`inline-block px-1.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold ${STATUS_COLORS[device.status]}`}
        >
          {device.status}
        </span>
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-500 text-xs sm:text-sm">
        {lastSeen}
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 flex gap-1 sm:gap-2">
        <button
          onClick={() => onView(device)}
          className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          aria-label={`View device ${device.name}`}
        >
          View
        </button>
        {isEnabled ? (
          <button
            onClick={() => onDisable(device)}
            className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Disable device ${device.name}`}
          >
            Disable
          </button>
        ) : (
          <button
            onClick={() => onEnable(device)}
            className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-green-500 text-green-700 hover:bg-green-50 transition-colors"
            aria-label={`Enable device ${device.name}`}
          >
            Enable
          </button>
        )}
      </td>
    </tr>
  );
}
