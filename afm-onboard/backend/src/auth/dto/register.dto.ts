import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsISO8601,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Имя не должно превышать 100 символов' })
  fullName: string;

  @IsString()
  @MinLength(2, { message: 'Должность должна содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Должность не должна превышать 100 символов' })
  position: string;

  @IsISO8601({}, { message: 'Дата рождения должна быть в формате ISO 8601' })
  birthDate: string;

  @IsEmail({}, { message: 'Некорректный формат email' })
  @MaxLength(255, { message: 'Email не должен превышать 255 символов' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(128, { message: 'Пароль не должен превышать 128 символов' })
  @Matches(/[A-Z]/, { message: 'Пароль должен содержать хотя бы одну заглавную букву' })
  @Matches(/[a-z]/, { message: 'Пароль должен содержать хотя бы одну строчную букву' })
  @Matches(/[0-9]/, { message: 'Пароль должен содержать хотя бы одну цифру' })
  @Matches(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/, {
    message: 'Пароль должен содержать хотя бы один спецсимвол (!@#$%^&*)',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Код регистрации не должен превышать 50 символов' })
  registrationCode?: string;
}
