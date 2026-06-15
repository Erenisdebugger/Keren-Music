FROM node:20-slim

WORKDIR /app

COPY artifacts/api-server/package.json artifacts/api-server/package-lock.json ./

RUN npm install --legacy-peer-deps --omit=dev

COPY artifacts/api-server/ .

ENV NODE_ENV=production

CMD ["node", "--no-warnings", "Shard.js"]
