FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json index.html src tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./

RUN npm ci

RUN npm run build

FROM nginx:alpine

WORKDIR /app

COPY --from=builder /app/dist /usr/share/nginx/html