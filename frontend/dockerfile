# Étape 1 : utiliser Node pour construire le frontend
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Définir la variable d'environnement React (par défaut pour Docker)
ENV REACT_APP_API_URL=http://backend:8000
ENV CHOKIDAR_USEPOLLING=true

# Exposer le port utilisé par React
EXPOSE 3000

# Lancer le serveur de développement
CMD ["npm", "start"]
