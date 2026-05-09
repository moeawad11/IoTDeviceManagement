import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DevicesModule } from './devices.module';
import { MqttService } from '../services/mqtt.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'MQTT_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            url: config.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883'),
          },
        }),
      },
    ]),
    DevicesModule,
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
