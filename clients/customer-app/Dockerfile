# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

# Install deps first (better cache)
COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci

# Copy the rest of the source
COPY . .

EXPOSE 5173

# Run Vite dev server, listening on all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
