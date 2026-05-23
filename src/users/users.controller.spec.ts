import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a user', () => {
    const createUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: UserRole.DEVELOPER,
      password: 'secret123',
    };

    controller.create(createUserDto);

    expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
  });

  it('finds all users', () => {
    controller.findAll();

    expect(mockUsersService.findAll).toHaveBeenCalled();
  });

  it('finds one user by id', () => {
    controller.findOne('4');

    expect(mockUsersService.findOne).toHaveBeenCalledWith(4);
  });

  it('updates a user by id', () => {
    const updateUserDto = {
      fullName: 'Updated User',
      role: UserRole.ADMIN,
    };

    controller.update('4', updateUserDto);

    expect(mockUsersService.update).toHaveBeenCalledWith(4, updateUserDto);
  });

  it('removes a user by id', () => {
    controller.remove('4');

    expect(mockUsersService.remove).toHaveBeenCalledWith(4);
  });
});