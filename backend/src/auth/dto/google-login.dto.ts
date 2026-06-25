import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ example: 'google-id-token-here', description: 'Google OAuth ID token' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
