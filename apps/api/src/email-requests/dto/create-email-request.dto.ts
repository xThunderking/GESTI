import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEmailRequestDto {
  @ApiProperty({ example: 'María López Hernández' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  fullName: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  collaboratorNo: string;

  @ApiProperty({ example: 'Radiología' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area: string;

  @ApiProperty({ example: 'Médico especialista' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  position: string;

  @ApiProperty({ example: 'Requiere correo para comunicación institucional.' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  justification: string;

  @ApiProperty({ example: 'maria.lopez' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  suggestedEmail: string;

  @ApiProperty({ example: 'Correo institucional' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  service: string;

  @ApiProperty({ example: 'Dr. Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  requestingBoss: string;

  @ApiProperty({ example: 'Lic. Ana García' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  areaDirector: string;

  @ApiProperty({ example: 'Ing. Carlos Ruiz' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  tiResponsible: string;
}
