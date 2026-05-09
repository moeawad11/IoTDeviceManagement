import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DevicesService } from 'src/services/devices.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceStatusDto } from '../dto/update-device-status.dto';
import { GetDevicesQueryDto } from '../dto/get-devices-query.dto';

@ApiTags('Devices')
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant identifier',
})
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created' })
  @ApiResponse({ status: 409, description: 'Serial number already exists' })
  create(@Body() dto: CreateDeviceDto, @Req() req: Request) {
    const tenantId = req['tenantId'] as string;
    return this.devicesService.createDevice(dto, tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'List devices for tenant (paginated, filterable by status)',
  })
  findAll(@Req() req: Request, @Query() query: GetDevicesQueryDto) {
    const tenantId = req['tenantId'] as string;
    return this.devicesService.getDevices(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single device by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const tenantId = req['tenantId'] as string;
    return this.devicesService.getDevice(id, tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update device status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceStatusDto,
    @Req() req: Request,
  ) {
    const tenantId = req['tenantId'] as string;
    return this.devicesService.updateStatus(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a device' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const tenantId = req['tenantId'] as string;
    await this.devicesService.deleteDevice(id, tenantId);
    return { message: `Device ${id} deleted successfully` };
  }
}
