FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Create entrypoint script properly
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "$GOOGLE_CREDENTIALS" | base64 -d > /app/src/google_secret.json' >> /entrypoint.sh && \
    echo 'exec npm start' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Build the app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Ensure src directory exists and has proper permissions
RUN mkdir -p src && chmod -R 755 src

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]