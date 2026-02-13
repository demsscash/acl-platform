import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeofenceType, GeofenceAlertType } from '../../database/entities';

class CoordinateDto {
  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;
}

export class CreateGeofenceDto {
  @ApiProperty({ description: 'Nom de la geofence' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['circle', 'polygon'], description: 'Type de geofence' })
  @IsEnum(GeofenceType)
  type: GeofenceType;

  @ApiPropertyOptional({ description: 'Latitude du centre (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional({ description: 'Longitude du centre (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiPropertyOptional({ description: 'Rayon en mètres (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ description: 'Coordonnées du polygone', type: [CoordinateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates?: CoordinateDto[];

  @ApiPropertyOptional({ enum: ['enter', 'exit', 'both'], description: "Type d'alerte" })
  @IsOptional()
  @IsEnum(GeofenceAlertType)
  alertType?: GeofenceAlertType;

  @ApiPropertyOptional({ description: 'Couleur pour affichage carte' })
  @IsOptional()
  @IsString()
  couleur?: string;

  @ApiPropertyOptional({ description: 'IDs des trackers à associer', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  trackerIds?: number[];
}

export class UpdateGeofenceDto {
  @ApiPropertyOptional({ description: 'Nom de la geofence' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['circle', 'polygon'], description: 'Type de geofence' })
  @IsOptional()
  @IsEnum(GeofenceType)
  type?: GeofenceType;

  @ApiPropertyOptional({ description: 'Latitude du centre (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional({ description: 'Longitude du centre (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiPropertyOptional({ description: 'Rayon en mètres (pour type cercle)' })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ description: 'Coordonnées du polygone', type: [CoordinateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates?: CoordinateDto[];

  @ApiPropertyOptional({ enum: ['enter', 'exit', 'both'], description: "Type d'alerte" })
  @IsOptional()
  @IsEnum(GeofenceAlertType)
  alertType?: GeofenceAlertType;

  @ApiPropertyOptional({ description: 'Couleur pour affichage carte' })
  @IsOptional()
  @IsString()
  couleur?: string;

  @ApiPropertyOptional({ description: 'IDs des trackers à associer', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  trackerIds?: number[];
}
