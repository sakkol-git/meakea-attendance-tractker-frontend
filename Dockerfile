FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NUXT_PUBLIC_DATA_SOURCE=remote
ARG NUXT_PUBLIC_API_BASE_URL=https://hrflow.test/api/v1
ENV NUXT_PUBLIC_DATA_SOURCE=$NUXT_PUBLIC_DATA_SOURCE
ENV NUXT_PUBLIC_API_BASE_URL=$NUXT_PUBLIC_API_BASE_URL
RUN node scripts/validate-build.mjs && npm run generate

FROM caddy:2.9-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/.output/public /srv
EXPOSE 3000
