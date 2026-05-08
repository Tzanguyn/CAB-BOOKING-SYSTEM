FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY services/storage-service/package*.json ./

# Install dependencies
RUN npm install --omit=dev --no-package-lock --no-audit --no-fund && npm cache clean --force

# Copy source code
COPY services/storage-service/src/ ./src/
COPY services/storage-service/index.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

RUN chown -R appuser:nodejs /app
USER appuser

# Expose port
EXPOSE 3015

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3015/api/storage/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
