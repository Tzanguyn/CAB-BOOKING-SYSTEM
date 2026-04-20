# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    mongodb-tools \
    redis \
    && rm -rf /var/cache/apk/*

# Copy package files from the service directory
COPY services/driver-service/package*.json ./

# Install dependencies without the lockfile to avoid npm v10/v11 lock resolution issues in Docker
RUN npm install --omit=dev --no-package-lock --no-audit --no-fund && npm cache clean --force

# Copy source code from the repository root build context
COPY services/driver-service/src/ ./src/
COPY services/driver-service/index.js ./

COPY shared/ /shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory and shared helpers
RUN chown -R nextjs:nodejs /app /shared
USER nextjs

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3007/api/drivers/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "index.js"]