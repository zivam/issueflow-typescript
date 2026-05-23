import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes login dto to auth service', () => {
    const loginDto = {
      username: 'safeuser',
      password: 'secret123',
    };

    controller.login(loginDto);

    expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
  });

  it('extracts bearer token from authorization header on logout', () => {
    const request = {
      headers: {
        authorization: 'Bearer test-token',
      },
    } as any;

    controller.logout(request);

    expect(mockAuthService.logout).toHaveBeenCalledWith('test-token');
  });

  it('passes empty token to logout when authorization header is missing', () => {
    const request = {
      headers: {},
    } as any;

    controller.logout(request);

    expect(mockAuthService.logout).toHaveBeenCalledWith('');
  });

  it('passes empty token to logout when authorization header is invalid', () => {
    const request = {
      headers: {
        authorization: 'Basic test-token',
      },
    } as any;

    controller.logout(request);

    expect(mockAuthService.logout).toHaveBeenCalledWith('');
  });

  it('returns current user from auth service', () => {
    const request = {
      user: {
        id: 4,
        username: 'safeuser',
        role: 'DEVELOPER',
      },
    } as any;

    controller.me(request);

    expect(mockAuthService.me).toHaveBeenCalledWith({
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
    });
  });
});