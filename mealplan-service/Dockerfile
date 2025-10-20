FROM node:20

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ .

EXPOSE 5009

CMD ["node", "server.js"]
