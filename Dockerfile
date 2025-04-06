# Dockerfile

# Use Node 20 on Alpine 3.20
FROM node:20.14.0-alpine3.20

# Install required system dependency for sharp (vips-dev) BEFORE npm install
RUN apk add --no-cache vips-dev

# Define build-time argument (can be passed via docker-compose)
ARG GEMINI_API_KEY

# Set environment variable (will be overwritten by docker-compose environment)
# Using ARG here allows the build process (`npm run build`) to potentially access it if needed.
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
# Set working directory
WORKDIR /app

# Copy package files, Prisma schema, and .env file
COPY package*.json ./

RUN npm install

# Rebuild sharp to ensure native binaries work on Alpine
RUN npm rebuild sharp

# Copy the rest of the application code
COPY . .

# Build the Next.js app for production
RUN npm run build

# Expose the port the app listens on (internal to container)
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]
