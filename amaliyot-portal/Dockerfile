# Amaliyot portali: bitta konteyner (server + veb-sahifalar). PostgreSQL alohida konteynerda (docker-compose.yml).
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/src ./src
COPY db /app/db
COPY web /app/web
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && mkdir -p /data && chown -R node:node /data /app
ENV WEB_DIR=/app/web DATA_DIR=/data MIGRATIONS_DIR=/app/db/migrations PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/entrypoint.sh"]
