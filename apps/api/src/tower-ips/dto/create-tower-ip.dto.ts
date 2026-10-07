import { ApiProperty } from '@nestjs/swagger';
import { IsIP, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTowerIpDto {
  @ApiProperty({ example: '192.168.10.25' })
  @IsIP('4')
  ip: string;

  @ApiProperty({ example: '203' })
  @IsString()
  @Matches(/^\d+$/, { message: 'El consultorio solo puede contener numeros.' })
  @MaxLength(120)
  office: string;
}
