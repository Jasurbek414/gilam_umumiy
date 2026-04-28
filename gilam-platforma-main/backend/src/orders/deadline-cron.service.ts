import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DeadlineCronService {
  private readonly logger = new Logger(DeadlineCronService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Har soatda tekshirish (yoki EVERY_10_MINUTES qilib sinab ko'rsangiz ham bo'ladi)
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines() {
    this.logger.log('Muddatli buyurtmalarni tekshirish boshlandi...');
    
    // Hozirdan keyingi 1 kunlik vaqtni hisoblash 
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Barcha Hali Yuvilayotgan (AT_FACILITY, WASHING, DRYING) yoki Yuvilmagan (NEW) ishlar
    // Agar deadlineDateTime 24 soatdan kam bo'lsa
    const nearingDeadlineOrders = await this.orderRepository.find({
      where: [
        { status: OrderStatus.AT_FACILITY, deadlineDate: LessThan(tomorrow) },
        { status: OrderStatus.WASHING,     deadlineDate: LessThan(tomorrow) },
        { status: OrderStatus.DRYING,      deadlineDate: LessThan(tomorrow) },
      ],
      relations: ['company', 'driver']
    });

    for (const order of nearingDeadlineOrders) {
      if (!order.deadlineDate) continue;

      const timeLeftMs = order.deadlineDate.getTime() - new Date().getTime();
      if (timeLeftMs > 0 && timeLeftMs < 24 * 60 * 60 * 1000) {
        
        // Agar huddi shu buyurtmaga oldin xabar yuborilgan bo'lsa (Buni belgilash uchun Notification qidirish ham mumkin, hozircha oddiy har soat jo'natadi)
        const msgTitle = "Diqqat! Gilam muddati yaqinlashmoqda ⏱";
        const msgBody = `Buyurtma #${order.id.slice(0,6)} ni qadoqlashga oz vaqt qoldi. Iltimos jarayonni tezlashtiring!`;

        this.logger.log(`Ogohlantirish yuborildi: Order=${order.id}`);

        // Platforma orqali notification (Sex va Operatorlarga)
        await this.notificationsService.create({
          companyId: order.companyId,
          title: msgTitle,
          text: msgBody,
          type: 'alert'
        });

        // Haydovchiga ham e'tibor qilish uchun (Balki sexdagilar Push tokenlarini ulasak ularga ham)
        if (order.driver) {
           const driverInfo = await this.orderRepository.manager.findOne(User, { where: {id: order.driverId} });
           if(driverInfo && driverInfo.expoPushToken) {
              this.notificationsService.sendPushNotification(driverInfo.expoPushToken, msgTitle, msgBody, { orderId: order.id });
           }
        }
      }
    }
  }
}
