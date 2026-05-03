FROM node:24 AS build-step

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# remove dev-dependencies, now they are no longer needed
# we can't do this before (let alone run npm ci --omit=dev above), since this
# step needs typescript and other develpoment build-tools dependencies.
RUN rm -rf node_modules
RUN npm ci --omit=dev

FROM node:24 AS prod

WORKDIR /app

# environment variables that the back-end server needs to work
ENV APP_NAME=
ENV APP_URL=
ENV APP_VERSION=
ENV JWT_PUBLIC_KEY=
ENV JWT_PRIVATE_KEY=
ENV JWT_AUDIENCE=
ENV DATABASE_URL=
ENV PORT=80
ENV NODE_ENV=production

COPY --from=build-step /app/node_modules ./node_modules/
COPY --from=build-step /app/dist ./dist/
COPY --from=build-step /app/prisma ./prisma/
COPY --from=build-step /app/package-lock.json /app/package.json ./
COPY --from=build-step /app/scripts/start.sh ./

EXPOSE $PORT

RUN useradd -m server && \
    chown -R server:server /app && \
    chmod +x /app/start.sh

USER server

ENTRYPOINT [ "sh", "./start.sh" ]