import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeCaisse } from '../../database/entities/caisse.entity';

export class CreateCaisseDto {
  @ApiProperty({ description: 'Nom de la caisse', example: 'Caisse Centrale' })
  @IsString()
  nom: string;

  @ApiProperty({ enum: TypeCaisse, description: 'Type de caisse' })
  @IsEnum(TypeCaisse)
  type: TypeCaisse;

  @ApiPropertyOptional({ description: 'Solde initial', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  soldeInitial?: number;

  @ApiPropertyOptional({ description: 'Caisse active', default: true })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}

export class UpdateCaisseDto {
  @ApiPropertyOptional({ description: 'Nom de la caisse' })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({ enum: TypeCaisse, description: 'Type de caisse' })
  @IsEnum(TypeCaisse)
  @IsOptional()
  type?: TypeCaisse;

  @ApiPropertyOptional({ description: 'Caisse active' })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}
