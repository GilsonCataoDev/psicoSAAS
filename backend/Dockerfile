FROM node:20-alpine

RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
