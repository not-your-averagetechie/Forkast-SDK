import { loadAppConfig } from "./AppConfig.js"
import { ethers } from "ethers"
import { KmsProvider } from "aws-kms-provider";

let provider;
export const getProvider = async () => {
    if (provider == null || provider == undefined) {
        const config = loadAppConfig();
        provider = new ethers.providers.Web3Provider(new KmsProvider(
            config.networkHttpsUrl,
            {
              region: config.region,
              keyIds: [ config.keyId ],
              credential: {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretKey
              }
            },
        ));
    }
    return provider;
}