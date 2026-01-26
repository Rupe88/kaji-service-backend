# Use Node.js 18 on Alpine Linux for a small image size
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies including dev dependencies for build
# and exact versions from lock file
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies to slim down the image
# (Optional: sometimes risky if build scripts needed them, but usually safe after build)
# RUN npm prune --production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
