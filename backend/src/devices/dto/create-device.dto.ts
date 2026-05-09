import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceStatus } from '../models/device.enum';

export class CreateDeviceDto {
  @ApiProperty({ example: 'Door Sensor A1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'ESP32-001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  serialNumber!: string;

  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType)
  type!: DeviceType;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;
}
