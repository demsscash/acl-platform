import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeMouvement } from '../../database/entities/mouvement-caisse.entity';

export class CreateMouvementDto {
  @ApiProperty({ enum: TypeMouvement, description: 'Type de mouvement' })
  @IsEnum(TypeMouvement)
  type: TypeMouvement;

  @ApiProperty({ description: 'Nature/description de la transaction' })
  @IsString()
  nature: string;

  @ApiProperty({ description: 'Montant du mouvement' })
  @IsNumber()
  @Min(0.01)
  montant: number;

  @ApiPropertyOptional({ description: 'Bénéficiaire (pour les sorties)' })
  @IsString()
  @IsOptional()
  beneficiaire?: string;

  @ApiPropertyOptional({ description: 'ID de la caisse destination (pour les virements)' })
  @IsNumber()
  @IsOptional()
  caisseDestinationId?: number;

  @ApiPropertyOptional({ description: 'Date du mouvement' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Référence externe (facture, etc.)' })
  @IsString()
  @IsOptional()
  referenceExterne?: string;
}

export class VirementDto {
  @ApiProperty({ description: 'ID de la caisse source' })
  @IsNumber()
  caisseSourceId: number;

  @ApiProperty({ description: 'ID de la caisse destination' })
  @IsNumber()
  caisseDestinationId: number;

  @ApiProperty({ description: 'Montant du virement' })
  @IsNumber()
  @Min(0.01)
  montant: number;

  @ApiProperty({ description: 'Nature/motif du virement' })
  @IsString()
  nature: string;

  @ApiPropertyOptional({ description: 'Date du virement' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsString()
  @IsOptional()
  notes?: string;
}
