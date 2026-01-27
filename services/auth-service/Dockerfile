# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    redis \
    && rm -rf /var/cache/apk/*

# Copy shared workspace dependency first (used by file:../../shared)
COPY shared/ /shared/

# Install shared dependencies (needed because file: dependency is a symlink to /shared)
RUN cd /shared && npm install --only=production && npm cache clean --force

# Copy package files
COPY services/auth-service/package*.json ./

# Install dependencies

RUN npm install --omit=dev && npm cache clean --force


# Copy source code
COPY services/auth-service/src/ ./src/
COPY services/auth-service/index.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3004/auth/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "index.js"]