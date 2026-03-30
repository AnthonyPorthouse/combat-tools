FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY ./src ./src

RUN npm ci

RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

WORKDIR /app

COPY --from=builder /app/dist /usr/share/nginx/html

USER nginx