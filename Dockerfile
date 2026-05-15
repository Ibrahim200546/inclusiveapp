FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_AUTH_STORAGE_KEY=sb-mmugalgqdapidqqxekqt-auth-token
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_AUTH_STORAGE_KEY=$VITE_SUPABASE_AUTH_STORAGE_KEY

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/dist ./dist
COPY api ./api
COPY server ./server
COPY package.json ./package.json

EXPOSE 8080

CMD ["node", "server/production-server.mjs"]
