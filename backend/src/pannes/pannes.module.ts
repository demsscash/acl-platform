import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Panne, Camion } from '../database/entities';
import { PannesService } from './pannes.service';
import { PannesController } from './pannes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Panne, Camion])],
  controllers: [PannesController],
  providers: [PannesService],
  exports: [PannesService],
})
export class PannesModule {}
