import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIP, IsString, Matches, MaxLength } from 'class-validator';

export class BulkCreateTowerIpsDto {
  @ApiProperty({ example: '203' })
  @IsString()
  @Matches(/^\d+$/, { message: 'El consultorio solo puede contener numeros.' })
  @MaxLength(120)
  office: string;

  @ApiProperty({ type: [String], example: ['192.168.10.25', '192.168.10.26'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1024)
  @ArrayUnique()
  @IsIP('4', { each: true })
  ips: string[];
}
