import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MiClaveSegura12!' })
  @IsString()
  @MinLength(9, { message: 'La contrasena debe tener mas de 8 caracteres.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'La contrasena debe incluir una mayuscula.' })
  @Matches(/(?:.*\d){2}/, { message: 'La contrasena debe incluir al menos 2 numeros.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'La contrasena debe incluir un simbolo especial.' })
  newPassword: string;

  @ApiProperty({ example: 'MiClaveSegura12!' })
  @IsString()
  @MaxLength(128)
  confirmation: string;
}
