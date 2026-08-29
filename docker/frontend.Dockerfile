FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/apps/client
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
