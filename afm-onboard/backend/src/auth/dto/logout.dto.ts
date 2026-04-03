import { IsString, IsUUID } from 'class-validator';

export class LogoutDto {
  @IsUUID('4', { message: 'Некорректный формат userId' })
  userId: string;

  @IsString()
  refreshToken: string;
}
