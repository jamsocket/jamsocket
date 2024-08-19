FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# typecheck because this isn't done automatically by the build process
RUN npx tsc --noEmit
RUN npx rollup -c /app/src/session-backend/rollup.config.mjs > /app/bundle.mjs

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/bundle.mjs .
CMD ["node", "bundle.mjs"]
