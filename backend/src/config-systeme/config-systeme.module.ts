import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigSysteme } from '../database/entities';
import { ConfigSystemeService } from './config-systeme.service';
import { ConfigSystemeController } from './config-systeme.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigSysteme])],
  controllers: [ConfigSystemeController],
  providers: [ConfigSystemeService],
  exports: [ConfigSystemeService],
})
export class ConfigSystemeModule {}
