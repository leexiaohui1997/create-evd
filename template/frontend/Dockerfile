FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

# The resulting image contains the built files in /app/dist