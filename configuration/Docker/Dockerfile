FROM node:14

# Create app directory
RUN mkdir -p /usr/src/app/lib

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)

# Copy required packages to image
COPY package*.json ./
COPY server.js  ./
COPY lib/* ./lib/

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 8001

CMD [ "node", "server.js" ]