FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Expose API port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
