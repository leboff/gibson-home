# --- Build stage: compile the Vite static bundle ---
FROM node:22-alpine AS build
WORKDIR /app

# Install deps from the lockfile (includes devDeps needed for tsc + vite build).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Serve stage: tiny nginx serving the static dist/ ---
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
