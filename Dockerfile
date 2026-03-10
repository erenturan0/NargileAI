# Aşama 1: Frontend Build
FROM node:20-alpine AS build
WORKDIR /app

# Bağımlılıkları yükle (Sadece frontend için gerekli olabilir, ama hepsi yüklenecek)
COPY package*.json ./
RUN npm install

# Kaynak kodları kopyala
COPY . .

# Vite ile production derlemesini yap
RUN npm run build

# Aşama 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Prod bağımlılıklarını yükle (Daha küçük imaj boyutu için)
COPY package*.json ./
RUN npm install --omit=dev

# Backend dosyalarını ve derlenmiş frontend'i kopyala
COPY --from=build /app/dist ./dist
COPY server.js .
COPY database.js .
COPY .env* ./

# Port ayarı (Cloud Run varsayılan olarak 8080 bekler, ama biz PORT environment variable'ını okuyacağız)
ENV PORT=8080
EXPOSE 8080

# Sadece backend'i devredecek komut
CMD ["npm", "start"]
