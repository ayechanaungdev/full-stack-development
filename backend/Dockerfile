# ============================================
# Stage 1: BUILD — Compile TypeScript + Prisma
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

RUN npx prisma generate

COPY . .
RUN npm run build

RUN npm prune --omit=dev

# ============================================
# Stage 2: PRODUCTION — Lean runtime image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main"]