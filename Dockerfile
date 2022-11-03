FROM node:14-alpine3.16

ENV NODE_OPTIONS="–max_old_space_size=80"

# Create src directory
WORKDIR /usr/src/app

COPY . .

RUN apk add --no-cache --virtual .build-deps \
    ca-certificates \
    wget \
    tar && \
    cd /usr/local/bin && \
    wget https://yarnpkg.com/latest.tar.gz && \
    tar zvxf latest.tar.gz && \
    ln -s /usr/local/bin/dist/bin/yarn.js /usr/local/bin/yarn.js && \
    apk del .build-deps

RUN yarn install --frozen-lockfile

CMD [ "yarn", "start" ]
