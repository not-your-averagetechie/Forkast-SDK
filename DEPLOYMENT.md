# 🚀 Deploying Market Monitor Bot on Render.com

## 📋 Prerequisites

1. **Render.com Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your bot code should be in a GitHub repo
3. **Environment Variables**: Prepare your wallet credentials and API endpoints

## 🔧 Environment Variables Required

### **API Endpoints**
```bash
MAINNET_MARKET_API_URL=https://your-api-endpoint.com/market/event
MAINNET_ACCOUNT_API_URL=https://your-api-endpoint.com/account/login
MAINNET_ORDER_API_URL=https://your-api-endpoint.com/orders
```

### **Wallet Credentials**
```bash
MAINNET_WALLET_ADDRESS_3=0x...
MAINNET_PRIVATE_KEY_3=0x...
MAINNET_PROXY_WALLET_3=0x...

MAINNET_WALLET_ADDRESS_4=0x...
MAINNET_PRIVATE_KEY_4=0x...
MAINNET_PROXY_WALLET_4=0x...

MAINNET_WALLET_ADDRESS_5=0x...
MAINNET_PRIVATE_KEY_5=0x...
MAINNET_PROXY_WALLET_5=0x...
```

### **Configuration**
```bash
NETWORK=mainnet
LATEST_MARKET_ID=650
ORDER_BOOK_API_URL=https://api.forkast.gg/api/v1/orderbook
```

## 🚀 Deployment Steps

### **Option 1: Using render.yaml (Recommended)**

1. **Push to GitHub**: Ensure all files are committed and pushed
2. **Connect Repository**: 
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository with your bot

3. **Deploy Blueprint**:
   - Render will automatically detect `render.yaml`
   - Review the configuration
   - Click "Apply" to deploy

### **Option 2: Manual Deployment**

1. **Create New Service**:
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click "New +" → "Worker Service"

2. **Configure Service**:
   - **Name**: `market-monitor-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx ts-node market-monitor-bot.ts`

3. **Set Environment Variables**:
   - Add all required environment variables
   - Mark sensitive ones (private keys) as "Secret"

4. **Deploy**: Click "Create Worker Service"

## ⚙️ Service Configuration

### **Plan Selection**
- **Starter**: $7/month - Good for testing
- **Standard**: $25/month - Recommended for production
- **Pro**: $50/month - For high-volume operations

### **Auto-Deploy Settings**
- **Auto-Deploy**: Disabled (recommended for bots)
- **Branch**: `feature/arbitrage-bot` or `main`

## 🔍 Monitoring & Health Checks

### **Health Check Endpoint**
- **URL**: `https://your-service.onrender.com/health`
- **Response**: JSON with status and uptime
- **Frequency**: Every 30 seconds

### **Logs**
- **Access**: Render dashboard → Your service → Logs
- **Real-time**: View live logs during operation
- **Retention**: 30 days (free plan) / 90 days (paid plans)

## 📊 Performance Considerations

### **Resource Limits**
- **Starter Plan**: 512MB RAM, 0.1 CPU
- **Standard Plan**: 1GB RAM, 0.5 CPU
- **Pro Plan**: 2GB RAM, 1 CPU

### **Optimizations**
- **Memory**: Bot uses ~200-300MB RAM
- **CPU**: Low usage, mostly I/O bound
- **Network**: Minimal outbound requests

## 🚨 Troubleshooting

### **Common Issues**

1. **Build Failures**:
   - Check `package.json` dependencies
   - Ensure TypeScript compilation passes
   - Verify Node.js version compatibility

2. **Runtime Errors**:
   - Check environment variables
   - Verify API endpoints are accessible
   - Review logs for specific error messages

3. **Service Crashes**:
   - Check memory usage
   - Verify wallet credentials
   - Ensure API rate limits aren't exceeded

### **Debug Commands**
```bash
# Check service status
curl https://your-service.onrender.com/health

# View logs
# Use Render dashboard → Logs tab
```

## 🔄 Updates & Maintenance

### **Updating the Bot**
1. **Push Changes**: Commit and push to GitHub
2. **Manual Deploy**: Trigger deployment from Render dashboard
3. **Monitor**: Watch logs for successful startup

### **Environment Variable Changes**
1. **Update Variables**: Modify in Render dashboard
2. **Redeploy**: Restart service to apply changes
3. **Verify**: Check logs for successful configuration

## 💰 Cost Estimation

### **Monthly Costs**
- **Starter Plan**: $7/month
- **Standard Plan**: $25/month
- **Pro Plan**: $50/month

### **Bandwidth**
- **Free Tier**: 750 hours/month
- **Paid Plans**: Unlimited

## 🎯 Best Practices

1. **Security**: Never commit private keys to Git
2. **Monitoring**: Set up alerts for service failures
3. **Backups**: Regular database/log backups
4. **Testing**: Test in staging environment first
5. **Documentation**: Keep deployment guide updated

## 📞 Support

- **Render Support**: [help.render.com](https://help.render.com)
- **Documentation**: [render.com/docs](https://render.com/docs)
- **Community**: [render.com/community](https://render.com/community)

---

**Happy Deploying! 🚀**
