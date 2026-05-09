import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DevicesService } from 'src/services/devices.service';
import { Device } from 'src/models/device.model';
import { DeviceStatus, DeviceType } from 'src/models/device.enum';

const mockDevice: Device = {
  id: 'uuid-1',
  name: 'Test Device',
  serialNumber: 'ESP32-001',
  type: DeviceType.ESP32,
  status: DeviceStatus.OFFLINE,
  tenantId: 'tenant-1',
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('DevicesService', () => {
  let service: DevicesService;
  let repo: jest.Mocked<Repository<Device>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    repo = module.get(getRepositoryToken(Device));
  });

  describe('createDevice', () => {
    it('should create and return a device with OFFLINE status and no lastSeenAt', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockDevice);
      repo.save.mockResolvedValue(mockDevice);

      const result = await service.createDevice(
        {
          name: 'Test Device',
          serialNumber: 'ESP32-001',
          type: DeviceType.ESP32,
        },
        'tenant-1',
      );

      expect(result).toEqual(mockDevice);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Device',
          serialNumber: 'ESP32-001',
          type: DeviceType.ESP32,
          tenantId: 'tenant-1',
          lastSeenAt: null,
        }),
      );
    });

    it('should set lastSeenAt when creating device with ONLINE status', async () => {
      const onlineDevice = { ...mockDevice, status: DeviceStatus.ONLINE };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(onlineDevice);
      repo.save.mockResolvedValue(onlineDevice);

      const result = await service.createDevice(
        {
          name: 'Online Device',
          serialNumber: 'ESP32-002',
          type: DeviceType.ESP32,
          status: DeviceStatus.ONLINE,
        },
        'tenant-1',
      );

      expect(result.status).toBe(DeviceStatus.ONLINE);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSeenAt: expect.any(Date) as Date,
        }),
      );
    });

    it('should throw ConflictException if serialNumber already exists', async () => {
      repo.findOne.mockResolvedValue(mockDevice);

      await expect(
        service.createDevice(
          {
            name: 'Other Device',
            serialNumber: 'ESP32-001',
            type: DeviceType.ESP32,
          },
          'tenant-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should update status to ONLINE and set lastSeenAt', async () => {
      const device = { ...mockDevice };
      repo.findOne.mockResolvedValue(device);
      repo.save.mockImplementation((d) => Promise.resolve(d as Device));

      const result = await service.updateStatus('uuid-1', 'tenant-1', {
        status: DeviceStatus.ONLINE,
      });

      expect(result.status).toBe(DeviceStatus.ONLINE);
      expect(result.lastSeenAt).toBeInstanceOf(Date);
    });

    it('should update status to OFFLINE without touching lastSeenAt', async () => {
      const device = { ...mockDevice, lastSeenAt: new Date('2025-01-01') };
      repo.findOne.mockResolvedValue(device);
      repo.save.mockImplementation((d) => Promise.resolve(d as Device));

      const result = await service.updateStatus('uuid-1', 'tenant-1', {
        status: DeviceStatus.OFFLINE,
      });

      expect(result.status).toBe(DeviceStatus.OFFLINE);
      expect(result.lastSeenAt).toEqual(new Date('2025-01-01'));
    });

    it('should throw NotFoundException if device not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('bad-id', 'tenant-1', {
          status: DeviceStatus.ONLINE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
