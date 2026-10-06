import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'HP LaserJet M404' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  printerName: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
