# Build stages for each microservice

# ─── Base stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json .
COPY shared/package.json shared/
COPY service-registry/package.json service-registry/
COPY api-gateway/package.json api-gateway/
COPY event-store/package.json event-store/
COPY services/user-service/package.json services/user-service/
COPY services/order-service/package.json services/order-service/
COPY services/payment-service/package.json services/payment-service/
COPY services/base-service.ts services/

# ─── Shared module ──────────────────────────────────────────────────────────
FROM base AS shared-build
COPY shared/ ./shared/
RUN npm install
RUN npm run build -w @microservices/shared

# ─── Service Registry ───────────────────────────────────────────────────────
FROM base AS registry-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY service-registry/ ./service-registry/
RUN npm install
RUN npm run build -w @microservices/service-registry

FROM node:20-alpine AS registry
WORKDIR /app
COPY --from=registry-build /app .
CMD ["node", "service-registry/dist/index.js"]
EXPOSE 3001

# ─── Event Store ────────────────────────────────────────────────────────────
FROM base AS event-store-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY event-store/ ./event-store/
RUN npm install
RUN npm run build -w @microservices/event-store

FROM node:20-alpine AS event-store
WORKDIR /app
COPY --from=event-store-build /app .
CMD ["node", "event-store/dist/index.js"]
EXPOSE 3002

# ─── API Gateway ────────────────────────────────────────────────────────────
FROM base AS gateway-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY api-gateway/ ./api-gateway/
RUN npm install
RUN npm run build -w @microservices/api-gateway

FROM node:20-alpine AS api-gateway
WORKDIR /app
COPY --from=gateway-build /app .
CMD ["node", "api-gateway/dist/index.js"]
EXPOSE 8080

# ─── User Service ───────────────────────────────────────────────────────────
FROM base AS user-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY services/user-service/ ./services/user-service/
COPY services/base-service.ts ./services/
RUN npm install
RUN npm run build -w @microservices/user-service

FROM node:20-alpine AS user-service
WORKDIR /app
COPY --from=user-build /app .
CMD ["node", "services/user-service/dist/index.js"]
EXPOSE 3003

# ─── Order Service ──────────────────────────────────────────────────────────
FROM base AS order-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY services/order-service/ ./services/order-service/
COPY services/base-service.ts ./services/
RUN npm install
RUN npm run build -w @microservices/order-service

FROM node:20-alpine AS order-service
WORKDIR /app
COPY --from=order-build /app .
CMD ["node", "services/order-service/dist/index.js"]
EXPOSE 3004

# ─── Payment Service ────────────────────────────────────────────────────────
FROM base AS payment-build
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY services/payment-service/ ./services/payment-service/
COPY services/base-service.ts ./services/
RUN npm install
RUN npm run build -w @microservices/payment-service

FROM node:20-alpine AS payment-service
WORKDIR /app
COPY --from=payment-build /app .
CMD ["node", "services/payment-service/dist/index.js"]
EXPOSE 3005
