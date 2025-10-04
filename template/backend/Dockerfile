FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build
RUN cp package.json dist/package.json
COPY VERSION dist/VERSION
EXPOSE 7001
# Default to production start; dev compose can override the command.
CMD ["pnpm", "start"]