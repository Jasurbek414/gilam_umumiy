import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FacilityStage } from './entities/facility-stage.entity';
import { OrderAction } from './entities/order-action.entity';
import { Service, MeasurementUnit } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CallsGateway } from '../gateway/calls.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(FacilityStage)
    private facilityStageRepository: Repository<FacilityStage>,
    @InjectRepository(OrderAction)
    private orderActionRepository: Repository<OrderAction>,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => CallsGateway))
    private readonly callsGateway: CallsGateway,
  ) {}

  private calculateItemPrice(
    item: { width?: number; length?: number; quantity: number },
    service: Service,
  ): number {
    const price = Number(service.price);

    switch (service.measurementUnit) {
      case MeasurementUnit.SQM:
        const width = Number(item.width) || 0;
        const length = Number(item.length) || 0;
        const area = width * length;
        return Math.round(area * price * 100) / 100;

      default:
        return Math.round(Number(item.quantity) * price * 100) / 100;
    }
  }

  async create(createOrderDto: CreateOrderDto) {
    const { items, ...orderData } = createOrderDto;

    // Run within transaction for ACID compliance
    return this.orderRepository.manager.transaction(
      async (manager: EntityManager) => {
        // 0. Pre-fetch services to infer companyId if missing and calculate prices later
        let services: Service[] = [];
        let serviceMap = new Map<string, Service>();
        if (items && items.length > 0) {
          const serviceIds = items.map((i) => i.serviceId);
          services = await manager.find(Service, {
            where: { id: In(serviceIds) },
          });
          serviceMap = new Map(services.map((s) => [s.id, s]));
          
          if (!orderData.companyId && services.length > 0) {
            orderData.companyId = services[0].companyId;
          }
        }

        // 1. Create Order shell
        const order = manager.create(Order, {
          ...orderData,
          status: OrderStatus.NEW,
          totalAmount: 0,
        });
        const savedOrder = await manager.save(order);

        let totalAmount = 0;

        if (items && items.length > 0) {
          const orderItems: OrderItem[] = [];

          for (const itemDto of items) {
            const service = serviceMap.get(itemDto.serviceId);
            if (!service) {
              throw new NotFoundException(
                `Xizmat #${itemDto.serviceId} topilmadi`,
              );
            }

            const totalPrice = this.calculateItemPrice(itemDto, service);
            totalAmount += totalPrice;

            const orderItem = manager.create(OrderItem, {
              orderId: savedOrder.id,
              serviceId: itemDto.serviceId,
              barcode: itemDto.barcode,
              width: itemDto.width,
              length: itemDto.length,
              quantity: itemDto.quantity,
              totalPrice,
            });

            orderItems.push(orderItem);
          }

          await manager.save(orderItems);
        }

        // 3. Finalize Order total
        savedOrder.totalAmount = totalAmount;
        const finalOrder = await manager.save(savedOrder);

        // Side Effect: Notification (Post-transaction or safe async)
        this.notificationsService
          .create({
            companyId: finalOrder.companyId,
            title: 'Yangi buyurtma',
            text: `Yangi buyurtma qabul qilindi. ID: ${finalOrder.id.substring(0, 8)}`,
            type: 'order',
          })
          .catch((err) => console.error('Notification failed:', err));

        // 📡 Real-time: barcha operatorlarga WebSocket orqali xabar
        try {
          const fullOrder = await manager.findOne(Order, {
            where: { id: finalOrder.id },
            relations: ['customer', 'driver', 'operator', 'items', 'items.service', 'company'],
          });
          this.callsGateway.server
            ?.to(`company:${finalOrder.companyId}`)
            .emit('order:new', fullOrder || finalOrder);
        } catch (wsErr) {
          console.warn('[WS] order:new emit failed:', wsErr);
        }

        return finalOrder;
      },
    );
  }

  async findAll() {
    return this.orderRepository.find({
      relations: [
        'customer',
        'driver',
        'operator',
        'items',
        'items.service',
        'company',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByCompany(companyId: string) {
    return this.orderRepository.find({
      where: { companyId },
      relations: ['customer', 'driver', 'operator', 'items', 'items.service'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'driver',
        'operator',
        'items',
        'items.service',
        'company',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Buyurtma #${id} topilmadi`);
    }
    return order;
  }

  async updateStatus(id: string, updateDto: any, userId?: string) {
    const order = await this.findOne(id);

    if (updateDto.status) {
      order.status = updateDto.status;
    }
    if (updateDto.facilityStageId !== undefined) {
      order.facilityStageId = updateDto.facilityStageId || null;
    }
    if (updateDto.driverId) {
      order.driverId = updateDto.driverId;
      // Haydovchi tayinlanganda status avtomatik o'zgaradi
      if (order.status === OrderStatus.NEW) {
        order.status = OrderStatus.DRIVER_ASSIGNED;
        await this.notificationsService.create({
          companyId: order.companyId,
          title: 'Haydovchi tayinlandi',
          text: `Buyurtmaga haydovchi biriktirildi.`,
          type: 'order',
        });
      }

      // 📱 HAYDOVCHI TELEFONIGA PUSH NOTIFICATION
      try {
        const driver = await this.orderRepository.manager.findOne(User, { where: { id: updateDto.driverId } });
        if (driver?.expoPushToken) {
          const customerName = order.customer?.fullName || 'Mijoz';
          const address = order.customer?.address || order.notes || 'Manzil ko\'rsatilmagan';
          this.notificationsService.sendPushNotification(
            driver.expoPushToken,
            '🆕 Yangi buyurtma!',
            `${customerName} — ${address}`,
            {
              type: 'new_order',
              orderId: order.id,
              channelId: 'default',
            },
          );
        }
      } catch (err) {
        console.warn('[Push] Driver assignment push fail:', err);
      }
    }
    if (updateDto.paymentStatus) {
      order.paymentStatus = updateDto.paymentStatus;
    }
    if (updateDto.notes) {
      order.notes = updateDto.notes;
    }
    if (updateDto.deadlineDate) {
      order.deadlineDate = new Date(updateDto.deadlineDate);
    }

    const saved = await this.orderRepository.save(order);

    // 📡 Real-time: company'ga buyurtma holati o'zgardi
    try {
      const fullOrder = await this.orderRepository.findOne({
        where: { id },
        relations: ['customer', 'driver', 'operator', 'items', 'items.service'],
      });
      this.callsGateway.server
        ?.to(`company:${order.companyId}`)
        .emit('order:updated', fullOrder || saved);
    } catch (wsErr) {
      console.warn('[WS] order:updated emit failed:', wsErr);
    }

    if (updateDto.status) {
      await this.notificationsService.create({
        companyId: order.companyId,
        title: "Buyurtma holati o'zgardi",
        text: `Holati: ${updateDto.status}`,
        type: 'order',
      });

      // 📱 STATUS O'ZGARGANDA HAYDOVCHIGA PUSH
      if (order.driverId) {
        try {
          const driver = await this.orderRepository.manager.findOne(User, { where: { id: order.driverId } });
          if (driver?.expoPushToken) {
            let pushTitle = '';
            let pushBody = '';

            if (updateDto.status === OrderStatus.READY_FOR_DELIVERY) {
              pushTitle = '🚐 Yetkazishga tayyor!';
              pushBody = `Buyurtma #${order.id.substring(0, 8)} qadoqlandi. Yo'lga chiqishingiz mumkin!`;
            } else if (updateDto.status === OrderStatus.WASHING) {
              pushTitle = '🧺 Gilam tozalanmoqda';
              pushBody = `Buyurtma #${order.id.substring(0, 8)} ishlov jarayonida.`;
            } else if (updateDto.status === OrderStatus.DELIVERED) {
              pushTitle = '✅ Yetkazib berildi';
              pushBody = `Buyurtma #${order.id.substring(0, 8)} muvaffaqiyatli yetkazildi!`;
            } else if (updateDto.status === OrderStatus.FINISHED) {
              pushTitle = '✨ Tayyor!';
              pushBody = `Buyurtma #${order.id.substring(0, 8)} tozalash yakunlandi, yetkazishga tayyor.`;
            }

            if (pushTitle) {
              this.notificationsService.sendPushNotification(
                driver.expoPushToken,
                pushTitle,
                pushBody,
                {
                  type: 'order_status',
                  orderId: order.id,
                  status: updateDto.status,
                  channelId: 'default',
                },
              );
            }
          }
        } catch (err) {
          console.warn('[Push] Status push fail:', err);
        }
      }
    }

    if (updateDto.status && userId) {
      const action = this.orderActionRepository.create({
        orderId: id,
        userId: userId,
        action: updateDto.status,
      });
      await this.orderActionRepository.save(action);
    }

    return saved;
  }

  async getWorkerCompletedOrders(companyId: string, userId: string) {
    const actions = await this.orderActionRepository.find({
      where: { userId },
      select: ['orderId'],
    });

    const orderIds = [...new Set(actions.map(a => a.orderId))];
    if (orderIds.length === 0) return [];

    return this.orderRepository.find({
      where: { id: In(orderIds), companyId },
      relations: ['customer', 'items', 'items.service', 'facilityStage'],
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async getFacilityStages(companyId: string) {
    const stages = await this.facilityStageRepository.find({
      where: { companyId },
      order: { orderIndex: 'ASC', createdAt: 'ASC' }
    });

    // Agar hech qanday bosqich topilmasa, standart bosqichlarni yaratamiz
    if (stages.length === 0) {
      const defaults = [
        { name: 'Sexga tushgan', icon: 'business', statusFilter: 'AT_FACILITY', orderIndex: 0 },
        { name: 'Yuvilmoqda', icon: 'water', statusFilter: 'WASHING', orderIndex: 1 },
        { name: 'Quritilmoqda', icon: 'sunny', statusFilter: 'DRYING', orderIndex: 2 },
        { name: 'Pardozda', icon: 'sparkles', statusFilter: 'FINISHED', orderIndex: 3 },
      ];
      for (const d of defaults) {
        const stage = this.facilityStageRepository.create({ companyId, ...d });
        await this.facilityStageRepository.save(stage);
      }
      return this.facilityStageRepository.find({
        where: { companyId },
        order: { orderIndex: 'ASC' }
      });
    }

    return stages;
  }

  async createFacilityStage(companyId: string, name: string, icon: string, statusFilter?: string) {
    const existing = await this.facilityStageRepository.find({ where: { companyId }});
    const nextIndex = existing.length > 0 ? Math.max(...existing.map(s => s.orderIndex)) + 1 : 0;
    const stage = this.facilityStageRepository.create({
      companyId,
      name,
      icon: icon || 'folder',
      orderIndex: nextIndex,
      statusFilter: statusFilter || null,
    });
    return this.facilityStageRepository.save(stage);
  }

  async deleteFacilityStage(id: string) {
    return this.facilityStageRepository.delete(id);
  }

  async reorderFacilityStages(companyId: string, stageIds: string[]) {
    for (let i = 0; i < stageIds.length; i++) {
      await this.facilityStageRepository.update(
        { id: stageIds[i], companyId },
        { orderIndex: i }
      );
    }
    return { success: true };
  }

  async getDriverActiveOrders(driverId: string) {
    return this.orderRepository.find({
      where: [
        { driverId, status: OrderStatus.DRIVER_ASSIGNED },
        { driverId, status: OrderStatus.PICKED_UP },
        // Haydovchi gibrid ko'rishi mumkin lekin asosan yetkazishlari
        { driverId, status: OrderStatus.READY_FOR_DELIVERY },
        { driverId, status: OrderStatus.OUT_FOR_DELIVERY },
      ],
      relations: ['customer', 'items', 'items.service'],
      order: { createdAt: 'DESC' },
    });
  }

  async getFacilityOrders(companyId: string) {
    return this.orderRepository.find({
      where: [
        { companyId, status: OrderStatus.AT_FACILITY },
        { companyId, status: OrderStatus.WASHING },
        { companyId, status: OrderStatus.DRYING },
        { companyId, status: OrderStatus.FINISHED },
        { companyId, status: OrderStatus.PICKED_UP }, // Ba'zan sexga yetib kelganini belgilash uchun
      ],
      relations: ['customer', 'items', 'items.service'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDriverCompletedOrders(driverId: string) {
    return this.orderRepository.find({
      where: [
        { driverId, status: OrderStatus.AT_FACILITY },
        { driverId, status: OrderStatus.WASHING },
        { driverId, status: OrderStatus.DRYING },
        { driverId, status: OrderStatus.FINISHED },
        { driverId, status: OrderStatus.DELIVERED },
        { driverId, status: OrderStatus.CANCELLED },
      ],
      relations: ['customer', 'items', 'items.service'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getFacilityCompletedOrders(companyId: string) {
    return this.orderRepository.find({
      where: [
        { companyId, status: OrderStatus.READY_FOR_DELIVERY },
        { companyId, status: OrderStatus.OUT_FOR_DELIVERY },
        { companyId, status: OrderStatus.DELIVERED },
        { companyId, status: OrderStatus.CANCELLED },
      ],
      relations: ['customer', 'items', 'items.service'],
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async getCompanyStats(companyId: string) {
    const orders = await this.orderRepository.find({
      where: { companyId },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const newOrders = orders.filter((o) => o.status === OrderStatus.NEW).length;
    const inProgress = orders.filter((o) =>
      [
        OrderStatus.DRIVER_ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.AT_FACILITY,
        OrderStatus.WASHING,
        OrderStatus.DRYING,
      ].includes(o.status),
    ).length;
    const completed = orders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    ).length;

    return { totalOrders, totalRevenue, newOrders, inProgress, completed };
  }

  async updateItemPrice(itemId: string, price: number) {
    const item = await this.orderItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(`Item #${itemId} topilmadi`);
    }

    item.totalPrice = price;
    await this.orderItemRepository.save(item);

    // Update order totalAmount
    const order = await this.orderRepository.findOne({
      where: { id: item.orderId },
      relations: ['items'],
    });

    if (order) {
      order.totalAmount = order.items.reduce(
        (acc, i) => acc + Number(i.totalPrice || 0),
        0,
      );
      await this.orderRepository.save(order);
    }

    return order;
  }

  /**
   * Sex hodimi o'lchovlardan keyin butun buyurtma summasini qo'lda belgilaydi.
   * Bu metod totalAmount ni to'g'ridan-to'g'ri yozadi va
   * company notification yaratadi.
   */
  async updateTotalAmount(id: string, totalAmount: number) {
    const order = await this.findOne(id);
    order.totalAmount = totalAmount;
    const saved = await this.orderRepository.save(order);

    this.notificationsService
      .create({
        companyId: order.companyId,
        title: 'Buyurtma narxi belgilandi',
        text: `Buyurtma #${id.substring(0, 8)} uchun summa: ${Number(totalAmount).toLocaleString()} so'm`,
        type: 'order',
      })
      .catch(() => {});

    return saved;
  }

  /**
   * Operator tayinlangan haydovchiga mijoz manzili va koordinatasini
   * push notification orqali yetkazadi.
   */
  async sendLocationToDriver(orderId: string, senderId: string): Promise<{ success: boolean }> {
    const order = await this.findOne(orderId);

    if (!order.driverId) {
      throw new NotFoundException('Bu buyurtmaga haydovchi tayinlanmagan');
    }

    const driver = await this.orderRepository.manager.findOne(User, {
      where: { id: order.driverId },
    });

    if (!driver) {
      throw new NotFoundException('Haydovchi topilmadi');
    }

    const customer = order.customer;
    const address = customer?.address || 'Manzil kiritilmagan';
    const location = customer?.location;

    // Koordinata mavjud bo'lsa Google Maps / Yandex deeplink yaratamiz
    let mapsUrl = '';
    if (location) {
      const coords = typeof location === 'object'
        ? `${location.lat},${location.lng}`
        : String(location);
      mapsUrl = `https://maps.google.com/?q=${coords}`;
    } else if (address && address !== 'Manzil kiritilmagan') {
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    }

    const pushBody = mapsUrl
      ? `📍 ${address} — Haritada ochish uchun bosing`
      : `📍 ${address}`;

    // Push notification
    if (driver.expoPushToken) {
      await this.notificationsService.sendPushNotification(
        driver.expoPushToken,
        `🗺️ Mijoz lokatsiyasi: ${customer?.fullName || 'Mijoz'}`,
        pushBody,
        {
          type: 'customer_location',
          orderId,
          customerId: customer?.id,
          customerName: customer?.fullName,
          address,
          location: location || null,
          mapsUrl,
        },
      );
    }

    return { success: true };
  }
}

