import { IsString, IsEmail, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный формат email' })
  @MaxLength(255, { message: 'Email не должен превышать 255 символов' })
  email: string;

  @IsString()
  @MaxLength(128, { message: 'Пароль не должен превышать 128 символов' })
  password: string;
}
