import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from './devices.service';
import { DeviceStatus } from '../models/device.enum';

interface StatusPayload {
  status: DeviceStatus;
  tenantId: string;
}

interface EventPayload {
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  tenantId: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client!: mqtt.MqttClient;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );

    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${brokerUrl}`);
      this.client.subscribe('devices/+/status', { qos: 1 });
      this.client.subscribe('devices/+/events', { qos: 1 });
      this.client.subscribe('devices/+/heartbeat', { qos: 0 });
      this.logger.log(
        'Subscribed to: devices/+/status, devices/+/events, devices/+/heartbeat',
      );
    });

    this.client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload);
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Disconnected from MQTT broker');
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const parts = topic.split('/');
    if (parts.length !== 3 || parts[0] !== 'devices') return;

    const [, serialNumber, action] = parts;
    let data: unknown;

    try {
      data = JSON.parse(payload.toString());
    } catch {
      this.logger.warn(`Invalid JSON on topic ${topic}`);
      return;
    }

    if (action === 'status') {
      await this.handleStatusUpdate(serialNumber, data as StatusPayload);
    } else if (action === 'events') {
      this.handleDeviceEvent(serialNumber, data as EventPayload);
    } else if (action === 'heartbeat') {
      await this.handleHeartbeat(serialNumber, data as { tenantId: string });
    }
  }

  private async handleStatusUpdate(serialNumber: string, data: StatusPayload) {
    const { status, tenantId } = data;

    if (!tenantId || !status) {
      this.logger.warn(`Missing tenantId or status for device ${serialNumber}`);
      return;
    }

    try {
      const device = await this.devicesService.findBySerialNumber(
        serialNumber,
        tenantId,
      );
      if (!device) {
        this.logger.warn(
          `Device not found: ${serialNumber} (tenant: ${tenantId})`,
        );
        return;
      }

      await this.devicesService.updateStatus(device.id, tenantId, { status });
      this.logger.log(`Updated ${serialNumber} → status: ${status}`);
    } catch (err) {
      this.logger.error(
        `Failed to update status for ${serialNumber}: ${(err as Error).message}`,
      );
    }
  }

  private handleDeviceEvent(serialNumber: string, data: EventPayload) {
    this.logger.log(
      `Event from ${serialNumber}: ${data.eventType} at ${data.timestamp}`,
    );
  }

  private async handleHeartbeat(
    serialNumber: string,
    data: { tenantId: string },
  ) {
    const { tenantId } = data;
    if (!tenantId) return;

    try {
      const device = await this.devicesService.findBySerialNumber(
        serialNumber,
        tenantId,
      );
      if (device) {
        await this.devicesService.updateStatus(device.id, tenantId, {
          status: DeviceStatus.ONLINE,
        });
        this.logger.log(`Heartbeat from ${serialNumber} — marked ONLINE`);
      }
    } catch (err) {
      this.logger.error(
        `Heartbeat error for ${serialNumber}: ${(err as Error).message}`,
      );
    }
  }
}
