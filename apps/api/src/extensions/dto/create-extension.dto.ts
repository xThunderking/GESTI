import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExtensionDto {
  @ApiProperty({ example: '2045' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  extension: string;

  @ApiProperty({ example: 'Extensión de recepción principal.' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 'Admisión' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area: string;
}
