import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}