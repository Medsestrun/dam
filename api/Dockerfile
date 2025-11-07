# --- build stage ---
    FROM oven/bun:1.1.22 as build
    WORKDIR /app
    COPY package.json bun.lock ./
    COPY src ./src
    COPY tsconfig.json ./
    RUN bun install --frozen-lockfile
    RUN bun build ./src/index.ts --target bun --outdir dist
    
    # --- runtime ---
    FROM oven/bun:1.1.22
    WORKDIR /app
    ENV NODE_ENV=production
    COPY --from=build /app/dist ./dist
    COPY package.json bun.lock ./
    RUN bun install --production --frozen-lockfile
    EXPOSE 8787
    HEALTHCHECK --interval=5s --timeout=3s --retries=10 CMD wget -qO- http://localhost:8787/health || exit 1
    CMD ["bun", "run", "dist/index.js"]