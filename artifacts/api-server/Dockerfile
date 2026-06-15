FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["node", "--no-warnings", "Shard.js"]
