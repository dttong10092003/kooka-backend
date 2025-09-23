FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ .

EXPOSE 5002
CMD ["npm", "start"]
