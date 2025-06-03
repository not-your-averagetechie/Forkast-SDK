import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MintService } from './mint.service';
import { BalanceResponse, LoginResponse } from '@forkastgg/forkast-sdk';

interface MintPCDto {
  wallet: "";
  creditAmount: number;
}

@Controller('mint')
export class MintController {
  constructor(private readonly mintService: MintService) {}

  @Post("/pc")
  async mintPC(@Body() body: MintPCDto): Promise<string> {
    return await this.mintService.mintPC(body);
  }

}