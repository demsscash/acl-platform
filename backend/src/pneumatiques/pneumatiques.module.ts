import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CataloguePneu, StockPneumatique, ControlePneumatique } from '../database/entities';
import { PneumatiquesService } from './pneumatiques.service';
import { PneumatiquesController } from './pneumatiques.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CataloguePneu, StockPneumatique, ControlePneumatique]),
  ],
  controllers: [PneumatiquesController],
  providers: [PneumatiquesService],
  exports: [PneumatiquesService],
})
export class PneumatiquesModule {}
