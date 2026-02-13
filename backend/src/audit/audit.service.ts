import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog, AuditAction } from '../database/entities';

interface AuditFilters {
  entityType?: string;
  entityId?: number;
  action?: AuditAction;
  userId?: number;
  dateDebut?: string;
  dateFin?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    entityType: string,
    entityId: number,
    action: AuditAction,
    userId: number | null,
    oldValues?: object,
    newValues?: object,
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      entityType,
      entityId,
      action,
      userId: userId ?? undefined,
      oldValues,
      newValues,
    });

    return this.auditRepository.save(auditLog);
  }

  async logCreate(
    entityType: string,
    entityId: number,
    userId: number | null,
    newValues: object,
  ): Promise<AuditLog> {
    return this.log(entityType, entityId, AuditAction.CREATE, userId, undefined, newValues);
  }

  async logUpdate(
    entityType: string,
    entityId: number,
    userId: number | null,
    oldValues: object,
    newValues: object,
  ): Promise<AuditLog> {
    return this.log(entityType, entityId, AuditAction.UPDATE, userId, oldValues, newValues);
  }

  async logDelete(
    entityType: string,
    entityId: number,
    userId: number | null,
    oldValues: object,
  ): Promise<AuditLog> {
    return this.log(entityType, entityId, AuditAction.DELETE, userId, oldValues, undefined);
  }

  async findAll(filters: AuditFilters = {}): Promise<AuditLog[]> {
    const query = this.auditRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user');

    if (filters.entityType) {
      query.andWhere('a.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters.entityId) {
      query.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    }

    if (filters.action) {
      query.andWhere('a.action = :action', { action: filters.action });
    }

    if (filters.userId) {
      query.andWhere('a.userId = :userId', { userId: filters.userId });
    }

    if (filters.dateDebut && filters.dateFin) {
      query.andWhere('a.createdAt BETWEEN :dateDebut AND :dateFin', {
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      });
    }

    return query
      .orderBy('a.createdAt', 'DESC')
      .take(500)
      .getMany();
  }

  async findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
