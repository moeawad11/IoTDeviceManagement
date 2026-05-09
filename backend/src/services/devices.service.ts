import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../models/device.model';
import { DeviceStatus } from '../models/device.enum';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceStatusDto } from '../dto/update-device-status.dto';
import { GetDevicesQueryDto } from '../dto/get-devices-query.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async createDevice(dto: CreateDeviceDto, tenantId: string): Promise<Device> {
    const existing = await this.deviceRepository.findOne({
      where: { serialNumber: dto.serialNumber, tenantId },
    });
    if (existing) {
      throw new ConflictException(
        `Device with serialNumber "${dto.serialNumber}" already exists`,
      );
    }

    const device = this.deviceRepository.create({
      ...dto,
      tenantId,
      lastSeenAt: dto.status === DeviceStatus.ONLINE ? new Date() : null,
    });
    return this.deviceRepository.save(device);
  }

  async getDevices(
    tenantId: string,
    query: GetDevicesQueryDto,
  ): Promise<{ data: Device[]; total: number; page: number; limit: number }> {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.deviceRepository
      .createQueryBuilder('device')
      .where('device.tenantId = :tenantId', { tenantId });

    if (status) {
      qb.andWhere('device.status = :status', { status });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('device.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getDevice(id: string, tenantId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id, tenantId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateDeviceStatusDto,
  ): Promise<Device> {
    const device = await this.getDevice(id, tenantId);

    device.status = dto.status;
    if (dto.status === DeviceStatus.ONLINE) {
      device.lastSeenAt = new Date();
    }

    return this.deviceRepository.save(device);
  }

  async deleteDevice(id: string, tenantId: string): Promise<void> {
    const device = await this.getDevice(id, tenantId);
    await this.deviceRepository.remove(device);
  }

  async findBySerialNumber(
    serialNumber: string,
    tenantId: string,
  ): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { serialNumber, tenantId },
    });
  }
}
