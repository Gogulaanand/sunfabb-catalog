import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminEnquiriesService } from './admin-enquiries.service.js';

const ENQUIRY = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Jane Doe',
  phone: '+919876543210',
  email: 'jane@example.com',
  message: 'Please share the available king-size bedspreads.',
  created_at: new Date('2026-09-12T08:30:00.000Z'),
};

const mockPrisma = {
  contactMessage: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AdminEnquiriesService', () => {
  let service: AdminEnquiriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminEnquiriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminEnquiriesService>(AdminEnquiriesService);
  });

  it('lists active enquiries newest-first with submitted fields and pagination', async () => {
    mockPrisma.contactMessage.findMany.mockResolvedValue([ENQUIRY]);
    mockPrisma.contactMessage.count.mockResolvedValue(21);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      enquiries: [ENQUIRY],
      total: 21,
      page: 2,
      limit: 10,
    });

    expect(mockPrisma.contactMessage.findMany).toHaveBeenCalledWith({
      where: { deleted_at: null },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        message: true,
        created_at: true,
      },
    });
    expect(mockPrisma.contactMessage.count).toHaveBeenCalledWith({
      where: { deleted_at: null },
    });
  });

  it('uses safe defaults when pagination is omitted', async () => {
    mockPrisma.contactMessage.findMany.mockResolvedValue([]);
    mockPrisma.contactMessage.count.mockResolvedValue(0);

    await expect(service.findAll({})).resolves.toEqual({
      enquiries: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });
});
