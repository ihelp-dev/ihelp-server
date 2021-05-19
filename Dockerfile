ARG NODE_IMAGE=node:10
ARG NODE_PORT=8081

FROM ${NODE_IMAGE}

# Create app directory
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)

# Copy required packages to image, node_modules should be included in .gitignore
COPY server .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE ${NODE_PORT}

CMD [ "node", "server.js" ]
