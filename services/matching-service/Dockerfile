FROM node:18-alpine

WORKDIR /app

COPY shared/ /shared/

# Copy package files from service directory
COPY services/matching-service/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY services/matching-service/src/ ./src/
COPY services/matching-service/index.js ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

RUN chown -R nextjs:nodejs /app /shared
USER nextjs

EXPOSE 3014

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3014/api/matching/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
