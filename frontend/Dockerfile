# Stage 1: Build
FROM node:20-alpine AS builder
ARG VITE_TENANT_ID=tenant-3
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_TENANT_ID=$VITE_TENANT_ID npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
