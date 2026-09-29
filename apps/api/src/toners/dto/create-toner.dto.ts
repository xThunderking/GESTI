import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTonerDto {
  @ApiProperty({ example: 'CF258A' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  color: string;

  @ApiProperty({ description: 'ID de la impresora compatible' })
  @IsUUID()
  printerId: string;
}
