import { Controller, Get, Query } from '@nestjs/common';
import { AccountService } from './account.service';
import { BalanceResponse, LoginResponse } from '@forkastgg/client';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}


  @Get("/login")
  async getLoginDetails(@Query('privateKey') privateKey: string): Promise<LoginResponse> {
    return await this.accountService.getLoginDetails(privateKey);
  }

  @Get("/balance")
  async getBalance(@Query('accessToken') accessToken: string): Promise<BalanceResponse> {
    return await this.accountService.getBalance(accessToken);
  }
}