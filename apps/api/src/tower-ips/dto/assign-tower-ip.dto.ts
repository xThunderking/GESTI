import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AssignTowerIpDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  responsible: string;

  @ApiProperty({ example: 'Torre Médica, piso 2' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  location: string;

  @ApiProperty({ default: false, description: 'Indica si la conexión utiliza módem/antena.' })
  @IsBoolean()
  antenna: boolean;

  @ApiPropertyOptional({ example: 'Requiere revisión de señal.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}
