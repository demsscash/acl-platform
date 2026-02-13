import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Caisse } from '../database/entities/caisse.entity';
import { MouvementCaisse } from '../database/entities/mouvement-caisse.entity';
import { CaissesService } from './caisses.service';
import { CaissesController } from './caisses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Caisse, MouvementCaisse])],
  controllers: [CaissesController],
  providers: [CaissesService],
  exports: [CaissesService],
})
export class CaissesModule {}
