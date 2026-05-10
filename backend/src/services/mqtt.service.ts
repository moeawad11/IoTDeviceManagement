import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import * as fs from 'fs';
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
    const endpoint = this.config.get<string>('AWS_IOT_ENDPOINT');
    const keyPath = this.config.get<string>('AWS_IOT_KEY_PATH');
    const certPath = this.config.get<string>('AWS_IOT_CERT_PATH');
    const caPath = this.config.get<string>('AWS_IOT_CA_PATH');
    const clientId = `iotdevmgmt-backend-${Math.random().toString(16).slice(2, 10)}`;

    if (!endpoint || !keyPath || !certPath || !caPath) {
      this.logger.error(
        'Missing AWS IoT Core configuration. Set AWS_IOT_ENDPOINT, AWS_IOT_KEY_PATH, AWS_IOT_CERT_PATH, AWS_IOT_CA_PATH.',
      );
      return;
    }

    this.client = mqtt.connect(`mqtts://${endpoint}:8883`, {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      ca: fs.readFileSync(caPath),
      clientId,
      protocol: 'mqtts',
      rejectUnauthorized: true,
    });

    this.client.on('connect', () => {
      this.logger.log(
        `Connected to AWS IoT Core at ${endpoint} (clientId: ${clientId})`,
      );
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
