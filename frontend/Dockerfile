FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build-time API URL (baked into the JS bundle)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# Production server
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: SPA routing + reverse proxy /api to backend
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
    proxy_pass http://backend:8000;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    }\n\
    location /ws/ {\n\
    proxy_pass http://backend:8000;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Upgrade $http_upgrade;\n\
    proxy_set_header Connection "upgrade";\n\
    }\n\
    }\n' > /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
