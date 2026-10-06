import { ApiProperty } from '@nestjs/swagger';
import { PrinterStatus } from '../../generated/prisma/client';
import { IsDateString, IsEnum, IsIP, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePrinterDto {
  @ApiProperty({ example: 'Radiologia' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area: string;

  @ApiProperty({ example: 'HP LaserJet Pro M404dn' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  model: string;

  @ApiProperty({ example: 'CNB1234567' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  serialNumber: string;

  @ApiProperty({ example: '192.168.1.100' })
  @IsIP()
  ip: string;

  @ApiProperty({ enum: PrinterStatus, default: PrinterStatus.ACTIVA })
  @IsEnum(PrinterStatus)
  status: PrinterStatus;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsible: string;

  @ApiProperty({ example: '2026-09-28' })
  @IsDateString()
  installationDate: string;
}
