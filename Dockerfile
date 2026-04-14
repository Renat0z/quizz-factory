# ─── Stage 1: build do frontend ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências (aproveita cache se package.json não mudou)
COPY package*.json ./
RUN npm ci

# Copia o restante e gera o build do Vite
COPY . .
RUN npm run build

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o servidor e o build do frontend
COPY server.js ./
COPY api/      ./api/
COPY db/       ./db/
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Healthcheck: bate na rota pública de quizzes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/quizzes || exit 1

CMD ["node", "server.js"]
