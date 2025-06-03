import { Injectable } from '@nestjs/common';
import { ethers } from "ethers";
import { getProvider } from "../config/Web3Config";
import { CGPC_ABI, CG_PC_DECIMAL_VALUE } from "../utils/Constants";
import { loadAppConfig } from "../config/AppConfig";

@Injectable()
export class MintService {

  async mintPC(body: { wallet: string; creditAmount: number }): Promise<string> {
    const { wallet, creditAmount } = body;

    const config = loadAppConfig();
    try {
        const provider = await getProvider();
        const signer = provider.getSigner();

        const cgpc = new ethers.Contract(config.predictionCreditsAddress, CGPC_ABI, signer);
        const amountInWei = ethers.utils.parseUnits(creditAmount.toString(), CG_PC_DECIMAL_VALUE);
        const tx = await cgpc.mint(wallet, amountInWei);

        console.log(`Transaction hash: ${tx.hash}`);
        return tx.hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error in transferring CGPC to ${wallet}: ${errorMessage}`);
      return errorMessage;

    }
  }
   
}