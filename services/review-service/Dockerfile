# ────────────────────────────────────────────────────────────────
# Stage 1: Builder (cài dependencies + build nếu cần)
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Cài các công cụ build native modules (nếu dự án có bcrypt, sharp, canvas, ...)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files trước để tận dụng Docker cache
COPY package*.json ./

# Cài dependencies production + dev (để build nếu có postinstall script)
RUN npm ci

# Copy source code
COPY . .

# (Tùy chọn) Nếu dự án có build step (ví dụ: tsc, vite build, ...)
# RUN npm run build

# ────────────────────────────────────────────────────────────────
# Stage 2: Production image (nhẹ nhất có thể)
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine

# Metadata labels (tốt cho Kubernetes, Docker Hub, ...)
LABEL maintainer="Review Service Team" \
      version="1.0" \
      description="Review microservice for ride-hailing platform"

# Set working directory
WORKDIR /app

# Cài các gói hệ thống cần thiết (rất ít)
RUN apk add --no-cache \
    tini

# Tạo non-root user & group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reviewapp -u 1001 -G nodejs

# Copy chỉ những gì cần thiết từ builder stage
COPY --from=builder --chown=reviewapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=reviewapp:nodejs /app/package*.json ./
COPY --from=builder --chown=reviewapp:nodejs /app/src ./src
COPY --from=builder --chown=reviewapp:nodejs /app/index.js ./
# Nếu có build output (dist, build folder), copy thêm
# COPY --from=builder --chown=reviewapp:nodejs /app/dist ./dist

# Đảm bảo quyền sở hữu
USER reviewapp

# Expose port (thay đổi nếu bạn dùng port khác trong .env)
EXPOSE 3006

# Healthcheck đáng tin cậy hơn (dùng wget nhẹ hơn http.get trong node)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3006/api/reviews/health || exit 1
# Sử dụng tini để xử lý zombie process & forward signals đúng cách
ENTRYPOINT ["/sbin/tini", "--"]

# Khởi động ứng dụng
# Giả sử package.json có script "start": "node index.js" hoặc "node src/index.js"
CMD ["npm", "start"]

# (Alternative nếu không dùng npm start)
# CMD ["node", "index.js"]