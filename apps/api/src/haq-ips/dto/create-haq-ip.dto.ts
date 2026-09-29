import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHaqIpDto {
  @ApiProperty({ example: '10.20.1.25' })
  @IsString()
  @MinLength(7)
  @MaxLength(45)
  ip: string;

  @ApiProperty({ example: 'Admisión' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area: string;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsible: string;

  @ApiProperty({ example: 'usuario.haq' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  username: string;

  @ApiPropertyOptional({ example: 'IP reservada para equipo de recepción.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;
}
