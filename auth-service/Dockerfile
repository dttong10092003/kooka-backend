FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ .

EXPOSE 5001
CMD ["npm", "start"]
