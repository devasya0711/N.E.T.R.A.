FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash python3 py3-pip

COPY package*.json ./
COPY scripts ./scripts

RUN npm install --omit=dev

COPY . .

# Expose API port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
