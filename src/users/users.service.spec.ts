import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockQueryBuilder = {
    where: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn(),
  };

  const mockUsersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const baseUser: User = {
    id: 4,
    username: 'safeuser',
    email: 'safeuser@example.com',
    fullName: 'Safe User',
    role: UserRole.DEVELOPER,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getMany.mockResolvedValue([baseUser]);
    mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a user with hashed password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');

    const createUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: UserRole.DEVELOPER,
      password: 'secret123',
    };

    mockUsersRepository.create.mockReturnValue({
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: UserRole.DEVELOPER,
      passwordHash: 'hashed-secret',
    });

    mockUsersRepository.save.mockResolvedValue({
      id: 10,
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: UserRole.DEVELOPER,
      passwordHash: 'hashed-secret',
    });

    const result = await service.create(createUserDto);

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);

    expect(mockUsersRepository.create).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      role: UserRole.DEVELOPER,
      passwordHash: 'hashed-secret',
    });

    expect(result.id).toBe(10);
    expect(result.passwordHash).toBe('hashed-secret');
  });

  it('finds all users ordered by id', async () => {
    mockUsersRepository.find.mockResolvedValue([baseUser]);

    const result = await service.findAll();

    expect(mockUsersRepository.find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
    });

    expect(result).toEqual([baseUser]);
  });

  it('finds only developer users ordered by id', async () => {
    mockUsersRepository.find.mockResolvedValue([baseUser]);

    const result = await service.findDevelopers();

    expect(mockUsersRepository.find).toHaveBeenCalledWith({
      where: { role: UserRole.DEVELOPER },
      order: { id: 'ASC' },
    });

    expect(result).toEqual([baseUser]);
  });

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('finds user by username', async () => {
    mockUsersRepository.findOne.mockResolvedValue(baseUser);

    const result = await service.findByUsername('safeuser');

    expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
      where: { username: 'safeuser' },
    });

    expect(result).toEqual(baseUser);
  });

  it('finds users by usernames case-insensitively using query builder', async () => {
    const result = await service.findByUsernames(['SafeUser', 'AUTHUSER']);

    expect(mockUsersRepository.createQueryBuilder).toHaveBeenCalledWith('user');

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.username) IN (:...usernames)',
      {
        usernames: ['safeuser', 'authuser'],
      },
    );

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
    expect(mockQueryBuilder.getMany).toHaveBeenCalled();

    expect(result).toEqual([baseUser]);
  });

  it('returns empty array when findByUsernames receives empty array', async () => {
    const result = await service.findByUsernames([]);

    expect(mockUsersRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('updates a user', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      ...baseUser,
    });

    mockUsersRepository.save.mockImplementation((user) =>
      Promise.resolve(user),
    );

    await service.update(4, {
      fullName: 'Updated User',
      role: UserRole.ADMIN,
    });

    expect(mockUsersRepository.save).toHaveBeenCalledWith({
      ...baseUser,
      fullName: 'Updated User',
      role: UserRole.ADMIN,
    });
  });

  it('removes a user', async () => {
    mockUsersRepository.findOne.mockResolvedValue(baseUser);
    mockUsersRepository.remove.mockResolvedValue(undefined);

    await service.remove(4);

    expect(mockUsersRepository.remove).toHaveBeenCalledWith(baseUser);
  });
});