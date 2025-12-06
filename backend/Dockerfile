FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src ./src

# Copy data files (Congress members, CEOs list)
COPY data ./data

# Copy pre-generated portraits for fast loading (no API calls needed)
COPY portraits ./portraits

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start server
CMD ["node", "src/server.js"]
