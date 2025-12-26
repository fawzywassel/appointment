# Backend Dockerfile - Development Mode
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for ts-node)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start in development mode (no build required)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
