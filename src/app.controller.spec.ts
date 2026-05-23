import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  const mockAppService = {
    getHello: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns hello message from app service', () => {
    mockAppService.getHello.mockReturnValue('Hello World!');

    const result = controller.getHello();

    expect(mockAppService.getHello).toHaveBeenCalled();
    expect(result).toBe('Hello World!');
  });
});