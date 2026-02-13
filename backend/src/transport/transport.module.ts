import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonTransport, BonLocation, Client, Camion, Chauffeur } from '../database/entities';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BonTransport, BonLocation, Client, Camion, Chauffeur]),
    NotificationsModule,
  ],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
