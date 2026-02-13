import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chauffeur, Camion, BonTransport, BonLocation, DotationCarburant, Panne } from '../database/entities';
import { ChauffeursService } from './chauffeurs.service';
import { ChauffeursController } from './chauffeurs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Chauffeur, Camion, BonTransport, BonLocation, DotationCarburant, Panne])],
  controllers: [ChauffeursController],
  providers: [ChauffeursService],
  exports: [ChauffeursService],
})
export class ChauffeursModule {}
