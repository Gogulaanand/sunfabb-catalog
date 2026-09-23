import { Test, TestingModule } from '@nestjs/testing';
import {
  AdminImagesService,
  CloudinaryUploadError,
} from './admin-images.service.js';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn(), destroy: jest.fn() },
  },
}));
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  productImage: { findFirst: jest.fn() },
};

describe('AdminImagesService', () => {
  let service: AdminImagesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.productImage.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminImagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
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

  it('rejects with a CloudinaryUploadError carrying the http_code', async () => {
    const mockStream = { end: jest.fn() };
    type CBErr = (
      err: { message: string; http_code: number },
      result: null,
    ) => void;
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_: unknown, cb: CBErr) => {
        cb({ message: 'Invalid image file', http_code: 400 }, null);
        return mockStream;
      },
    );

    await expect(
      service.uploadImage(Buffer.from('fake-image')),
    ).rejects.toMatchObject(
      new CloudinaryUploadError('Invalid image file', 400),
    );
  });

  it('deletes an uploaded Cloudinary asset by public id', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
      result: 'ok',
    });

    await expect(
      service.deleteUploadedImage('sunfabb/image'),
    ).resolves.toBeUndefined();
    expect(mockPrisma.productImage.findFirst).toHaveBeenCalledWith({
      where: { public_id: 'sunfabb/image' },
      select: { id: true },
    });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('sunfabb/image');
  });

  it('refuses to delete an asset that is already attached', async () => {
    mockPrisma.productImage.findFirst.mockResolvedValue({ id: 'image-1' });

    await expect(
      service.deleteUploadedImage('sunfabb/image'),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Uploaded image is already attached',
    });
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });
});
