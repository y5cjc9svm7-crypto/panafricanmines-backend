# PanAfricanMines backend — production image
FROM node:20-alpine

# Small init so SIGTERM is forwarded for graceful shutdown
RUN apk add --no-cache tini

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (leverages layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# App source
COPY . .

# Run as the unprivileged user that ships with the node image
USER node

EXPOSE 8080

# Container-level healthcheck hitting the liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
