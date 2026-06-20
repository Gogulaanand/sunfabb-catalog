import { Test, TestingModule } from '@nestjs/testing';
import { AdminImagesService } from './admin-images.service.js';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn() },
  },
}));
import { v2 as cloudinary } from 'cloudinary';

describe('AdminImagesService', () => {
  let service: AdminImagesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminImagesService],
    }).compile();

    service = module.get<AdminImagesService>(AdminImagesService);
  });

  it('uploads image and returns url and public_id', async () => {
    const mockResult = {
      secure_url: 'https://res.cloudinary.com/test/image.jpg',
      public_id: 'sunfabb/image',
    };
    const mockStream = { end: jest.fn() };
    type CB = (err: null, result: typeof mockResult) => void;
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_: unknown, cb: CB) => {
        cb(null, mockResult);
        return mockStream;
      },
    );

    const result = await service.uploadImage(Buffer.from('fake-image'));

    expect(result).toEqual({
      url: mockResult.secure_url,
      public_id: mockResult.public_id,
    });
  });

  it('rejects when cloudinary returns an error', async () => {
    const mockStream = { end: jest.fn() };
    type CBErr = (err: Error, result: null) => void;
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_: unknown, cb: CBErr) => {
        cb(new Error('Cloudinary error'), null);
        return mockStream;
      },
    );

    await expect(
      service.uploadImage(Buffer.from('fake-image')),
    ).rejects.toThrow('Cloudinary error');
  });
});
