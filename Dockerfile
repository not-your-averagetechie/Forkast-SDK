FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p order_book_logs

# Build TypeScript
RUN npm install -g typescript ts-node
RUN npx tsc --noEmit

# Set environment variables
ENV NODE_ENV=production
ENV NETWORK=mainnet

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the bot
CMD ["npx", "ts-node", "market-monitor-bot.ts"]
