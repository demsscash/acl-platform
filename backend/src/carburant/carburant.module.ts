import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuveCarburant, DotationCarburant, ApprovisionnementCuve, Fournisseur } from '../database/entities';
import { StationPartenaire } from '../database/entities/station-partenaire.entity';
import { CarburantService } from './carburant.service';
import { CarburantController } from './carburant.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CuveCarburant, DotationCarburant, ApprovisionnementCuve, Fournisseur, StationPartenaire])],
  controllers: [CarburantController],
  providers: [CarburantService],
  exports: [CarburantService],
})
export class CarburantModule {}
