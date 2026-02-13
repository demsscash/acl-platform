import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Alerte } from '../database/entities';

@Injectable()
export class AlertesService {
  constructor(
    @InjectRepository(Alerte)
    private readonly alerteRepository: Repository<Alerte>,
  ) {}

  async findAll(statut?: string): Promise<Alerte[]> {
    const where: any = {};
    if (statut) {
      where.statut = statut;
    }

    return this.alerteRepository.find({
      where,
      relations: ['camion'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findActives(): Promise<Alerte[]> {
    return this.alerteRepository.find({
      where: { statut: 'ACTIVE' as any },
      relations: ['camion'],
      order: { niveau: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Alerte> {
    const alerte = await this.alerteRepository.findOne({
      where: { id },
      relations: ['camion', 'utilisateurAcquittement'],
    });
    if (!alerte) {
      throw new NotFoundException(`Alerte #${id} non trouvée`);
    }
    return alerte;
  }

  async create(data: Partial<Alerte>): Promise<Alerte> {
    const alerte = this.alerteRepository.create(data);
    return this.alerteRepository.save(alerte);
  }

  async acquitter(id: number, userId: number): Promise<Alerte> {
    const alerte = await this.findOne(id);
    alerte.statut = 'ACQUITTEE' as any;
    alerte.acquitteePar = userId;
    alerte.acquitteeAt = new Date();
    return this.alerteRepository.save(alerte);
  }

  async resoudre(id: number): Promise<Alerte> {
    const alerte = await this.findOne(id);
    alerte.statut = 'RESOLUE' as any;
    alerte.resolueAt = new Date();
    return this.alerteRepository.save(alerte);
  }

  async getStats(): Promise<any> {
    const actives = await this.alerteRepository.count({ where: { statut: 'ACTIVE' as any } });
    const acquittees = await this.alerteRepository.count({ where: { statut: 'ACQUITTEE' as any } });
    const resolues = await this.alerteRepository.count({ where: { statut: 'RESOLUE' as any } });

    const critiques = await this.alerteRepository.count({
      where: { statut: 'ACTIVE' as any, niveau: 'CRITICAL' as any }
    });

    return {
      actives,
      acquittees,
      resolues,
      critiques,
      total: actives + acquittees + resolues,
    };
  }

  async getByType(): Promise<any> {
    const result = await this.alerteRepository
      .createQueryBuilder('a')
      .select('a.type_alerte', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('a.statut = :statut', { statut: 'ACTIVE' })
      .groupBy('a.type_alerte')
      .getRawMany();

    return result;
  }
}
