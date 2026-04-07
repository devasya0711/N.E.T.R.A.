# Stage 1: Build the Vite application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for cache layering
COPY package*.json ./
RUN npm install

# Copy source (this includes .env so Vite baked in keys)
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy the custom Nginx config to handle react-router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled dist from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
