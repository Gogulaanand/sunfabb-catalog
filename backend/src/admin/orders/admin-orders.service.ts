import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrdersService } from '../../orders/orders.service.js';
import { ORDER_STATUS_TRANSITIONS } from '../../orders/order-status.js';
import type { OrderStatus, Prisma } from '../../../generated/prisma/client.js';
import type { ListAdminOrdersDto } from './dto/list-admin-orders.dto.js';

const LIST_INCLUDE = {
  customer: { select: { full_name: true, email: true } },
  _count: { select: { items: true } },
} as const;

const DETAIL_INCLUDE = {
  customer: { select: { full_name: true, email: true, phone: true } },
  items: true,
  payments: true,
  shipment: true,
} as const;

function startOfDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function startOfNextDate(date: string): Date {
  const next = startOfDate(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async findAll(dto: ListAdminOrdersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    if (dto.date_from && dto.date_to && dto.date_from > dto.date_to) {
      throw new BadRequestException('date_from must be on or before date_to');
    }

    const createdAt: Prisma.DateTimeFilter = {};
    if (dto.date_from) createdAt.gte = startOfDate(dto.date_from);
    if (dto.date_to) createdAt.lt = startOfNextDate(dto.date_to);

    const where: Prisma.OrderWhereInput = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(Object.keys(createdAt).length > 0 ? { created_at: createdAt } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: LIST_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: rows.map((row) => ({
        id: row.id,
        order_number: row.order_number,
        status: row.status,
        customer: row.customer,
        total_paise: row.total_paise,
        created_at: row.created_at,
        item_count: row._count.items,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!order) throw new NotFoundException('Order not found');

    return {
      ...order,
      allowed_next_statuses: ORDER_STATUS_TRANSITIONS[order.status],
    };
  }

  async updateStatus(id: string, next: OrderStatus) {
    const current = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!current) throw new NotFoundException('Order not found');

    await this.ordersService.transition(current, next);
    return this.findOne(id);
  }
}
