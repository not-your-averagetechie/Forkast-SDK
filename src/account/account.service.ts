import { BalanceResponse, ForkastSDK, LoginResponse, Network, WalletDetails } from '@forkastgg/forkast-sdk';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountService {

  private readonly sdk = new ForkastSDK(Network.TESTNET);

  async createWallet(): Promise<WalletDetails> {
    const walletDetails = this.sdk.getAccountService().generateWallet();
    return walletDetails;
  }

  // async activeAndApproveTokensForProxyWallet(wallet: WalletDto): Promise<boolean> {
  //   const signer = new ethers.Wallet(wallet.privateKey);
  //   const proxyResponse = await this.sdk.getAccountService().activateProxyWallet(
  //     loginResponse.signature,
  //     loginResponse.accessToken
  //   );
  // }
  
  async getLoginDetails(privateKey: string): Promise<LoginResponse> {
    if(!privateKey) {
      throw new Error("Private key is required");
    }
    const loginResponse =  await this.sdk.getAccountService().loginWithPrivateKey(privateKey);
    return loginResponse;
  }

  async getBalance(accessToken:string): Promise<BalanceResponse> {
    const balance = await this.sdk.getBalancesService().getBalances(accessToken);
    return balance;
  }
}