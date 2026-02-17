# Base Image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Working Directory
WORKDIR /app

# Install Dependencies
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy Source Code
COPY . .

# Build Application
# This runs "vite build" and "esbuild"
RUN pnpm run build

# Final Stage
FROM node:20-slim
WORKDIR /app

# Copy only what's needed for production
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# Environment Variables Defaults
ENV NODE_ENV=production
ENV PORT=5000

# Start Command
CMD ["node", "dist/index.js"]
