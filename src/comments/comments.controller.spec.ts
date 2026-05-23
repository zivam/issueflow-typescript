import { Test, TestingModule } from '@nestjs/testing';
import {
  CommentsController,
  UserMentionsController,
} from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let userMentionsController: UserMentionsController;

  const mockCommentsService = {
    findAllByTicket: jest.fn(),
    findMentionsForUser: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController, UserMentionsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    userMentionsController = module.get<UserMentionsController>(
      UserMentionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('user mentions controller should be defined', () => {
    expect(userMentionsController).toBeDefined();
  });
});