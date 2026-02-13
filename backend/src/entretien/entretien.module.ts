import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maintenance } from '../database/entities/maintenance.entity';
import { Camion } from '../database/entities/camion.entity';
import { User } from '../database/entities/user.entity';
import { EntretienService } from './entretien.service';
import { EntretienController } from './entretien.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertesModule } from '../alertes/alertes.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, Camion, User]),
    NotificationsModule,
    AlertesModule,
    EmailModule,
  ],
  controllers: [EntretienController],
  providers: [EntretienService],
  exports: [EntretienService],
})
export class EntretienModule {}
