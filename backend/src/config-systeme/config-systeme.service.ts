import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfigSysteme } from '../database/entities';

// Known configuration keys
export const CONFIG_KEYS = {
  PRIX_CARBURANT_LITRE: 'PRIX_CARBURANT_LITRE',
} as const;

@Injectable()
export class ConfigSystemeService {
  constructor(
    @InjectRepository(ConfigSysteme)
    private readonly configRepository: Repository<ConfigSysteme>,
  ) {}

  async findAll(): Promise<ConfigSysteme[]> {
    return this.configRepository.find({
      relations: ['modificateur'],
      order: { cle: 'ASC' },
    });
  }

  async findByCle(cle: string): Promise<ConfigSysteme> {
    const config = await this.configRepository.findOne({
      where: { cle },
      relations: ['modificateur'],
    });
    if (!config) {
      throw new NotFoundException(`Configuration "${cle}" non trouvée`);
    }
    return config;
  }

  async getValue(cle: string): Promise<string> {
    const config = await this.findByCle(cle);
    return config.valeur;
  }

  async getNumericValue(cle: string): Promise<number> {
    const valeur = await this.getValue(cle);
    return parseFloat(valeur);
  }

  async setValue(cle: string, valeur: string, userId: number): Promise<ConfigSysteme> {
    let config = await this.configRepository.findOne({ where: { cle } });

    if (!config) {
      config = this.configRepository.create({
        cle,
        valeur,
        updatedBy: userId,
      });
    } else {
      config.valeur = valeur;
      config.updatedBy = userId;
    }

    return this.configRepository.save(config);
  }

  async getPrixCarburant(): Promise<number> {
    try {
      return await this.getNumericValue(CONFIG_KEYS.PRIX_CARBURANT_LITRE);
    } catch {
      // Default value if not configured
      return 850;
    }
  }

  async setPrixCarburant(prix: number, userId: number): Promise<ConfigSysteme> {
    return this.setValue(CONFIG_KEYS.PRIX_CARBURANT_LITRE, prix.toString(), userId);
  }
}
