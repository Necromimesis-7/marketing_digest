FROM node:22-alpine AS app

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ENV DATABASE_URL="file:../data/app.db"
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm run start"]
