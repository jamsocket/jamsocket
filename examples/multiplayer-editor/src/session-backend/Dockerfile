FROM node:18-alpine
WORKDIR /app
COPY src/session-backend/package.json src/session-backend/package-lock.json ./
RUN npm install
COPY src/types.ts ../types.ts
COPY src/session-backend/index.ts ./
COPY src/session-backend/tsconfig.json ./
RUN npx tsc
CMD ["node", "index.js"]
