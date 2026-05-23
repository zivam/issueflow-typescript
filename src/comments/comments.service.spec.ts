import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { UsersService } from '../users/users.service';
import { CommentMention } from './entities/comment-mention.entity';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockCommentMentionsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    findByUsernames: jest.fn(),
  };

  const mockAuditLogsService = {
    create: jest.fn(),
  };

  const baseComment: Comment = {
    id: 2,
    ticketId: 8,
    authorId: 4,
    content: 'Hello @safeuser',
    version: 1,
    createdAt: new Date('2026-05-23T05:38:01.232Z'),
    updatedAt: new Date('2026-05-23T05:38:01.232Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentsRepository,
        },
        {
          provide: getRepositoryToken(CommentMention),
          useValue: mockCommentMentionsRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when comment does not exist', async () => {
    mockCommentsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException when updating with an old version', async () => {
    mockCommentsRepository.findOne.mockResolvedValue({
      ...baseComment,
      version: 3,
    });

    await expect(
      service.update(2, {
        content: 'Old update',
        version: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mockCommentsRepository.save).not.toHaveBeenCalled();
  });

  it('creates a comment and persists case-insensitive mentions', async () => {
    mockCommentsRepository.create.mockImplementation((data) => data);
    mockCommentsRepository.save.mockImplementation((data) =>
      Promise.resolve({
        id: 10,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }),
    );

    mockUsersService.findByUsernames.mockResolvedValue([
      {
        id: 4,
        username: 'safeuser',
        fullName: 'Safe User',
      },
    ]);

    mockCommentMentionsRepository.create.mockImplementation((data) => data);
    mockCommentMentionsRepository.save.mockResolvedValue(undefined);
    mockCommentMentionsRepository.find.mockResolvedValue([
      {
        id: 1,
        commentId: 10,
        userId: 4,
      },
    ]);

    mockUsersService.findOne.mockResolvedValue({
      id: 4,
      username: 'safeuser',
      fullName: 'Safe User',
    });

    const result = await service.create(
      8,
      {
        authorId: 4,
        content: 'Please check this @SafeUser',
      },
      4,
    );

    expect(mockCommentMentionsRepository.delete).toHaveBeenCalledWith({
      commentId: 10,
    });

    expect(mockUsersService.findByUsernames).toHaveBeenCalledWith(['safeuser']);

    expect(mockCommentMentionsRepository.create).toHaveBeenCalledWith({
      commentId: 10,
      userId: 4,
    });

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.CREATE,
      entityType: 'COMMENT',
      entityId: 10,
      performedBy: 4,
    });

    expect(result.mentionedUsers).toEqual([
      {
        id: 4,
        username: 'safeuser',
        fullName: 'Safe User',
      },
    ]);
  });

  it('updates a comment, recalculates mentions, and creates audit log', async () => {
    mockCommentsRepository.findOne.mockResolvedValue({
      ...baseComment,
      version: 1,
    });

    mockCommentsRepository.save.mockImplementation((comment) =>
      Promise.resolve({
        ...comment,
        version: 2,
      }),
    );

    mockUsersService.findByUsernames.mockResolvedValue([
      {
        id: 5,
        username: 'publiccreate',
        fullName: 'Public Create',
      },
    ]);

    mockCommentMentionsRepository.create.mockImplementation((data) => data);
    mockCommentMentionsRepository.save.mockResolvedValue(undefined);
    mockCommentMentionsRepository.find.mockResolvedValue([
      {
        id: 2,
        commentId: 2,
        userId: 5,
      },
    ]);

    mockUsersService.findOne.mockResolvedValue({
      id: 5,
      username: 'publiccreate',
      fullName: 'Public Create',
    });

    const result = await service.update(
      2,
      {
        content: 'Updated comment @PublicCreate',
        version: 1,
      },
      4,
    );

    expect(mockCommentMentionsRepository.delete).toHaveBeenCalledWith({
      commentId: 2,
    });

    expect(mockUsersService.findByUsernames).toHaveBeenCalledWith([
      'publiccreate',
    ]);

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.UPDATE,
      entityType: 'COMMENT',
      entityId: 2,
      performedBy: 4,
    });

    expect(result.version).toBe(2);
    expect(result.mentionedUsers).toEqual([
      {
        id: 5,
        username: 'publiccreate',
        fullName: 'Public Create',
      },
    ]);
  });

  it('returns mentions for a user newest first', async () => {
    mockUsersService.findOne
      .mockResolvedValueOnce({
        id: 4,
        username: 'safeuser',
        fullName: 'Safe User',
      })
      .mockResolvedValue({
        id: 4,
        username: 'safeuser',
        fullName: 'Safe User',
      });

    mockCommentMentionsRepository.find
      .mockResolvedValueOnce([
        {
          id: 3,
          commentId: 30,
          userId: 4,
        },
        {
          id: 2,
          commentId: 20,
          userId: 4,
        },
      ])
      .mockResolvedValue([
        {
          id: 3,
          commentId: 30,
          userId: 4,
        },
      ]);

    mockCommentsRepository.find.mockResolvedValue([
      {
        ...baseComment,
        id: 20,
        content: 'Older mention @safeuser',
      },
      {
        ...baseComment,
        id: 30,
        content: 'Newer mention @safeuser',
      },
    ]);

    const result = await service.findMentionsForUser(4);

    expect(mockCommentMentionsRepository.find).toHaveBeenCalledWith({
      where: { userId: 4 },
      order: { id: 'DESC' },
    });

    expect(result.map((comment) => comment.id)).toEqual([30, 20]);
  });

  it('deletes a comment, clears mentions, and creates audit log', async () => {
    mockCommentsRepository.findOne.mockResolvedValue({
      ...baseComment,
      authorId: 4,
    });

    mockCommentMentionsRepository.delete.mockResolvedValue(undefined);
    mockCommentsRepository.remove.mockResolvedValue(undefined);

    await service.remove(2, 4);

    expect(mockCommentMentionsRepository.delete).toHaveBeenCalledWith({
      commentId: 2,
    });

    expect(mockCommentsRepository.remove).toHaveBeenCalledWith({
      ...baseComment,
      authorId: 4,
    });

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.DELETE,
      entityType: 'COMMENT',
      entityId: 2,
      performedBy: 4,
    });
  });
});