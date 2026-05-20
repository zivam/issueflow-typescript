import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  fullName?: string;
  role?: UserRole;
}