import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminEnquiriesController } from './admin-enquiries.controller.js';
import { AdminEnquiriesService } from './admin-enquiries.service.js';

const mockAdminEnquiries = { findAll: jest.fn() };

describe('AdminEnquiriesController', () => {
  let controller: AdminEnquiriesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEnquiriesController],
      providers: [
        { provide: AdminEnquiriesService, useValue: mockAdminEnquiries },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminEnquiriesController>(AdminEnquiriesController);
  });

  it('protects the enquiry list with the admin JWT guard', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      AdminEnquiriesController,
    ) as unknown;
    expect(guards).toContain(JwtAuthGuard);
  });

  it('delegates the validated paginated query', async () => {
    const query = { page: 2, limit: 10 };
    const response = { enquiries: [], total: 0, ...query };
    mockAdminEnquiries.findAll.mockResolvedValue(response);

    await expect(controller.findAll(query)).resolves.toBe(response);
    expect(mockAdminEnquiries.findAll).toHaveBeenCalledWith(query);
  });
});
