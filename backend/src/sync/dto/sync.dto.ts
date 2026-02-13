import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Types communs ====================

export class SyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ description: 'Données de l\'entité' })
  data: any;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncResultItemDto {
  @ApiProperty()
  localId: number;

  @ApiProperty()
  serverId: number;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  conflictResolution?: 'server_wins' | 'client_wins' | 'merged';
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  syncedAt: string;

  @ApiProperty({ type: [SyncResultItemDto] })
  results: SyncResultItemDto[];

  @ApiProperty()
  totalProcessed: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  errorCount: number;
}

// ==================== Dotations Carburant ====================

export class DotationSyncDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numeroBon?: string;

  @ApiProperty()
  @IsDateString()
  dateDotation: string;

  @ApiProperty()
  @IsNumber()
  camionId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  chauffeurId?: number;

  @ApiProperty()
  @IsNumber()
  quantiteLitres: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prixUnitaire?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kilometrageCamion?: number;

  @ApiProperty()
  @IsString()
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cuveId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationNom?: string;
}

export class DotationSyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ type: DotationSyncDataDto })
  @ValidateNested()
  @Type(() => DotationSyncDataDto)
  data: DotationSyncDataDto;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncDotationsDto {
  @ApiProperty({ type: [DotationSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotationSyncItemDto)
  items: DotationSyncItemDto[];
}

// ==================== Sorties Stock ====================

export class LigneSortieSyncDto {
  @ApiProperty()
  @IsNumber()
  pieceId: number;

  @ApiProperty()
  @IsNumber()
  quantite: number;
}

export class SortieSyncDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numeroBon?: string;

  @ApiProperty()
  @IsDateString()
  dateSortie: string;

  @ApiProperty()
  @IsNumber()
  camionId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kilometrageCamion?: number;

  @ApiProperty()
  @IsString()
  motif: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [LigneSortieSyncDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneSortieSyncDto)
  lignes: LigneSortieSyncDto[];
}

export class SortieSyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ type: SortieSyncDataDto })
  @ValidateNested()
  @Type(() => SortieSyncDataDto)
  data: SortieSyncDataDto;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncSortiesDto {
  @ApiProperty({ type: [SortieSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortieSyncItemDto)
  items: SortieSyncItemDto[];
}

// ==================== Bons Transport ====================

export class BonTransportSyncDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiProperty()
  @IsDateString()
  dateCreation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  camionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  chauffeurId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lieuChargement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lieuDechargement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  natureChargement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  poidsKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  montantHt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BonTransportSyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ type: BonTransportSyncDataDto })
  @ValidateNested()
  @Type(() => BonTransportSyncDataDto)
  data: BonTransportSyncDataDto;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncBonsTransportDto {
  @ApiProperty({ type: [BonTransportSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonTransportSyncItemDto)
  items: BonTransportSyncItemDto[];
}

// ==================== Bons Location ====================

export class BonLocationSyncDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFinPrevue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  camionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  chauffeurId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tarifJournalier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  carburantInclus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kmDepart?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BonLocationSyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ type: BonLocationSyncDataDto })
  @ValidateNested()
  @Type(() => BonLocationSyncDataDto)
  data: BonLocationSyncDataDto;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncBonsLocationDto {
  @ApiProperty({ type: [BonLocationSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonLocationSyncItemDto)
  items: BonLocationSyncItemDto[];
}

// ==================== Pannes ====================

export class PanneSyncDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numeroPanne?: string;

  @ApiProperty()
  @IsDateString()
  datePanne: string;

  @ApiProperty()
  @IsNumber()
  camionId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  chauffeurId?: number;

  @ApiProperty()
  @IsString()
  typePanne: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  coutEstime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localisation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kilometragePanne?: number;
}

export class PanneSyncItemDto {
  @ApiProperty({ description: 'ID local (client)' })
  @IsNumber()
  localId: number;

  @ApiPropertyOptional({ description: 'ID serveur si déjà synchronisé' })
  @IsOptional()
  @IsNumber()
  serverId?: number;

  @ApiProperty({ description: 'Action à effectuer' })
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiProperty({ type: PanneSyncDataDto })
  @ValidateNested()
  @Type(() => PanneSyncDataDto)
  data: PanneSyncDataDto;

  @ApiPropertyOptional({ description: 'Timestamp de création locale' })
  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;
}

export class SyncPannesDto {
  @ApiProperty({ type: [PanneSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanneSyncItemDto)
  items: PanneSyncItemDto[];
}

// ==================== Sync All ====================

export class SyncAllRequestDto {
  @ApiPropertyOptional({ type: [DotationSyncItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DotationSyncItemDto)
  dotations?: DotationSyncItemDto[];

  @ApiPropertyOptional({ type: [SortieSyncItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortieSyncItemDto)
  sortiesStock?: SortieSyncItemDto[];

  @ApiPropertyOptional({ type: [BonTransportSyncItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonTransportSyncItemDto)
  bonsTransport?: BonTransportSyncItemDto[];

  @ApiPropertyOptional({ type: [BonLocationSyncItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonLocationSyncItemDto)
  bonsLocation?: BonLocationSyncItemDto[];

  @ApiPropertyOptional({ type: [PanneSyncItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanneSyncItemDto)
  pannes?: PanneSyncItemDto[];
}

export class SyncAllResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  syncedAt: string;

  @ApiPropertyOptional()
  dotations?: SyncResultDto;

  @ApiPropertyOptional()
  sortiesStock?: SyncResultDto;

  @ApiPropertyOptional()
  bonsTransport?: SyncResultDto;

  @ApiPropertyOptional()
  bonsLocation?: SyncResultDto;

  @ApiPropertyOptional()
  pannes?: SyncResultDto;

  @ApiProperty()
  totalProcessed: number;

  @ApiProperty()
  totalSuccess: number;

  @ApiProperty()
  totalErrors: number;
}

// ==================== Reference Data Sync ====================

export class LastSyncRequestDto {
  @ApiPropertyOptional({ description: 'Timestamp de la dernière sync pour données incrémentielles' })
  @IsOptional()
  @IsDateString()
  lastSyncAt?: string;
}

export class ReferenceDataResponseDto {
  @ApiProperty()
  syncedAt: string;

  @ApiPropertyOptional()
  camions?: any[];

  @ApiPropertyOptional()
  chauffeurs?: any[];

  @ApiPropertyOptional()
  clients?: any[];

  @ApiPropertyOptional()
  cuves?: any[];

  @ApiPropertyOptional()
  pieces?: any[];

  @ApiPropertyOptional()
  fournisseurs?: any[];
}
