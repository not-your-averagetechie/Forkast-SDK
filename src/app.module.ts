import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './account/account.module';
import { MarketModule } from './market/market.module';
import { OrderModule } from './orders/orders.module';

@Module({
  imports: [AccountModule, MarketModule,OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
