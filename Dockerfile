# Single-stage image: builds the client and runs the API that serves it.
# Full node:20 (glibc + build tools) so better-sqlite3 installs its prebuilt
# binary — or compiles cleanly if a prebuild isn't available.
FROM node:20-bookworm

WORKDIR /app
ENV NODE_ENV=production

# Install deps first for layer caching. Force dev deps in too — the client build
# (vite, tailwind, tsc) needs them even though the runtime does not.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# App source.
COPY . .

# Build the React client into dist/. The server serves it in production.
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start"]
