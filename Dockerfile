FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p src && chmod -R 755 src

# Script para decodificar as credenciais do Google
RUN echo '#!/bin/sh\necho "$GOOGLE_CREDENTIALS" | base64 -d > src/google_secret.json\nexec npm start' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

RUN npm run build

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]