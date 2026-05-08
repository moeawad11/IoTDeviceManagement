import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceStatus } from '../models/device.enum';

export class UpdateDeviceStatusDto {
  @ApiProperty({ enum: DeviceStatus })
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;
}
