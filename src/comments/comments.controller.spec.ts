import { Test, TestingModule } from '@nestjs/testing';
import {
  CommentsController,
  UserMentionsController,
} from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let commentsController: CommentsController;
  let userMentionsController: UserMentionsController;

  const mockCommentsService = {
    findAllByTicket: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findMentionsForUser: jest.fn(),
  };

  const developerRequest = {
    user: {
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController, UserMentionsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    commentsController = module.get<CommentsController>(CommentsController);
    userMentionsController = module.get<UserMentionsController>(
      UserMentionsController,
    );
  });

  it('comments controller should be defined', () => {
    expect(commentsController).toBeDefined();
  });

  it('user mentions controller should be defined', () => {
    expect(userMentionsController).toBeDefined();
  });

  it('finds all comments by ticket id', () => {
    commentsController.findAll('8');

    expect(mockCommentsService.findAllByTicket).toHaveBeenCalledWith(8);
  });

  it('creates comment with ticket id and logged-in user id', () => {
    const createCommentDto = {
      authorId: 4,
      content: 'New comment @safeuser',
    };

    commentsController.create('8', createCommentDto, developerRequest);

    expect(mockCommentsService.create).toHaveBeenCalledWith(
      8,
      createCommentDto,
      4,
    );
  });

  it('updates comment with comment id and logged-in user id', () => {
    const updateCommentDto = {
      content: 'Updated comment @safeuser',
      version: 1,
    };

    commentsController.update('2', updateCommentDto, developerRequest);

    expect(mockCommentsService.update).toHaveBeenCalledWith(
      2,
      updateCommentDto,
      4,
    );
  });

  it('removes comment with comment id and logged-in user id', () => {
    commentsController.remove('2', developerRequest);

    expect(mockCommentsService.remove).toHaveBeenCalledWith(2, 4);
  });

  it('finds mentions for user id', () => {
    userMentionsController.findMentionsForUser('4');

    expect(mockCommentsService.findMentionsForUser).toHaveBeenCalledWith(4);
  });
});