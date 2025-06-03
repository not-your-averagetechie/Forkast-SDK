import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './account/account.module';
import { MarketModule } from './market/market.module';
import { OrderModule } from './orders/orders.module';
import { MintModule } from './mint/mint.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountModule, 
    MarketModule,
    OrderModule, 
    MintModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
