FROM node:20-alpine

# Install Python 3 and build tools
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
