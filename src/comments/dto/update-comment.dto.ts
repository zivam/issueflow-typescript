import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsInt()
  version?: number;
}