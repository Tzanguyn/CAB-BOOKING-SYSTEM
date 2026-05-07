FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json if it exists (for workspace dependencies)
# but for now we just copy what's needed
COPY shared ./shared
RUN cd shared && npm install
COPY customer-app ./customer-app

# Build shared if necessary (assuming it's just TS files)
WORKDIR /app/customer-app

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm install
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/customer-app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
