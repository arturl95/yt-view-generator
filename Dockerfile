# Use a base image with Node.js 20
FROM apify/actor-node-playwright-chrome:20

# Switch to root user to change permissions
USER root

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files first
COPY package*.json ./

# Change ownership of the app directory to 'myuser'
RUN chown -R myuser:myuser /usr/src/app

# Switch back to 'myuser' user
USER myuser

# Install only production dependencies
RUN npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy the rest of the application files with correct ownership
COPY --chown=myuser:myuser . .

# Start the application
CMD ["node", "app.js"]
