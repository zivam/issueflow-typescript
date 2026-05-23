import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByUsername: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in with valid credentials and returns access token', async () => {
    const loginDto: LoginDto = {
      username: 'safeuser',
      password: 'secret123',
    };

    mockUsersService.findByUsername.mockResolvedValue({
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
      passwordHash: 'hashed-password',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.signAsync.mockResolvedValue('signed-token');

    const result = await service.login(loginDto);

    expect(mockUsersService.findByUsername).toHaveBeenCalledWith('safeuser');

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'secret123',
      'hashed-password',
    );

    expect(mockJwtService.signAsync).toHaveBeenCalledWith({
      sub: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
    });

    expect(result).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });

  it('throws UnauthorizedException when username does not exist', async () => {
    mockUsersService.findByUsername.mockResolvedValue(null);

    await expect(
      service.login({
        username: 'missing',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when password is invalid', async () => {
    mockUsersService.findByUsername.mockResolvedValue({
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
      passwordHash: 'hashed-password',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        username: 'safeuser',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('revokes token on logout', () => {
    const result = service.logout('token-to-revoke');

    expect(result).toEqual({
      message: 'Logged out successfully',
    });

    expect(service.isTokenRevoked('token-to-revoke')).toBe(true);
  });

  it('returns false for token that was not revoked', () => {
    expect(service.isTokenRevoked('active-token')).toBe(false);
  });

  it('returns current user from me', () => {
    const user = {
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
    };

    expect(service.me(user)).toEqual(user);
  });
});