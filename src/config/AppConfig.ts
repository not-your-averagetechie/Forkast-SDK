export function loadAppConfig() {
  
  const secretsEnv = process.env;

  return {
    keyId: secretsEnv.LOOTBOX_AWS_KEY_ID ?? "",
    region: secretsEnv.LOOTBOX_AWS_REGION ?? "",
    accessKeyId: secretsEnv.LOOTBOX_AWS_ACCESS_KEY_ID ?? "",
    secretKey: secretsEnv.LOOTBOX_AWS_SECRET_KEY ?? "",
    networkHttpsUrl:
      secretsEnv.LOOTBOX_NETWORK_HTTPS_URL ??
        "https://saigon-testnet.roninchain.com/rpc",
    predictionCreditsAddress: process.env.PREDICTION_CREDITS_ADDRESS
  }
}