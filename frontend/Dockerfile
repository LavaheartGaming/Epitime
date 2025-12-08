# Étape 1 : build du frontend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copie du code + fichier .env
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
