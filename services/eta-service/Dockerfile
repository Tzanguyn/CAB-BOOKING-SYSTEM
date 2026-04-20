# Use Node.js LTS version
FROM node:18-alpine

WORKDIR /app

COPY shared/ /shared/

COPY services/eta-service/package*.json ./

RUN npm install --only=production && npm cache clean --force

COPY services/eta-service/src/ ./src/
COPY services/eta-service/index.js ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

RUN chown -R nextjs:nodejs /app /shared
USER nextjs

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3011/api/eta/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
