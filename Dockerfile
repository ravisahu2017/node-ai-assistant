# Use the official Node.js 18 image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port (your app listens on 8000)
EXPOSE 8000

# Start the server
CMD ["node", "openai_index.js"]
