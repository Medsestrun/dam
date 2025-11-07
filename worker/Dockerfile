FROM oven/bun:1.1.22 as base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    poppler-utils \
    imagemagick \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# sharp (если используешь) требует системные либы
RUN apt-get update && apt-get install -y --no-install-recommends libvips-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY package.json bun.lock ./
COPY src ./src
COPY tsconfig.json ./
RUN bun install --frozen-lockfile
RUN bun build ./src/index.ts --target bun --outdir dist

ENV NODE_ENV=production
VOLUME ["/tmp"]
CMD ["bun", "run", "dist/index.js"]