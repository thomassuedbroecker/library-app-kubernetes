FROM node:latest

RUN mkdir -p /app
# Set the working directory to /app
WORKDIR /app

# Install app dependencies
COPY package.json /app/
RUN npm install

# Copy the current directory contents into the container at /app
ADD . /app

EXPOSE 8080

CMD [ "npm", "start" ]
