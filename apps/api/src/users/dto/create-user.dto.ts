import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../../generated/prisma/client';
import { IsBoolean, IsEmail, IsEnum, MaxLength, MinLength, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Usuario General' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'usuario@gesti.local' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role: RoleName;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}
