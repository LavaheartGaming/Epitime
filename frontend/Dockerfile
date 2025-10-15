# ---- Frontend Dockerfile ----
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du projet React
COPY . .

# Lancement du serveur React
CMD ["npm", "start"]
