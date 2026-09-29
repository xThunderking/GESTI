import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComputerEquipmentDto {
  @ApiProperty({ example: 'PF3ABC123' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  serialNumber: string;

  @ApiProperty({ example: '192.168.1.25' })
  @IsString()
  @MinLength(7)
  @MaxLength(45)
  ip: string;

  @ApiProperty({ example: 'Dell OptiPlex 7090' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  model: string;

  @ApiProperty({ example: 'CI-000245' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ciId: string;

  @ApiProperty({ example: 'Computadora de escritorio' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  assetType: string;

  @ApiProperty({ example: 'Equipo asignado para trabajo administrativo.' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: '2026-09-29' })
  @IsDateString()
  equipmentDate: string;

  @ApiProperty({ example: 'Torre Médica - Consultorio 204' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  location: string;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsible: string;
}
