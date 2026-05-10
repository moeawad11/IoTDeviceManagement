import { Module } from '@nestjs/common';
import { DevicesModule } from './devices.module';
import { MqttService } from '../services/mqtt.service';

@Module({
  imports: [DevicesModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
