FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate --schema ./prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=4000
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=frontend-build /app/dist ./public
COPY backend/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]

# bust 20260624093259

# bust 20260624104834

# bust2 20260624105545
