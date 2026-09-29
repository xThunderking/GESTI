import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIP, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTowerIpDto {
  @ApiProperty({ example: '192.168.10.25' })
  @IsIP()
  ip: string;

  @ApiProperty({ example: 'Consultorio 203' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  office: string;

  @ApiProperty({ example: 'Torre Médica, piso 2' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  location: string;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsible: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  antenna: boolean;

  @ApiPropertyOptional({ example: 'Requiere revisión de señal.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}
