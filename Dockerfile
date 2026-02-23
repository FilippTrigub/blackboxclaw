FROM golang:1.25-alpine as wacli-builder
RUN apk add --no-cache git
WORKDIR /wacli-build
RUN git clone https://github.com/steipete/wacli.git .
RUN go build -o wacli ./cmd/wacli

FROM node:22-bookworm@sha256:cd7bcd2e7a1e6f72052feb023c7f6b722205d3fcab7bbcbd2d1bfdab10b1e935

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

# Install dependencies for Homebrew
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        procps \
        file \
        git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Homebrew (for skill installations)
# Install to /home/node/.linuxbrew so the node user owns it
RUN mkdir -p /home/node/.linuxbrew && \
    chown -R node:node /home/node/.linuxbrew

USER node
ENV HOMEBREW_PREFIX="/home/node/.linuxbrew"
RUN git clone https://github.com/Homebrew/brew ${HOMEBREW_PREFIX}/Homebrew && \
    mkdir -p ${HOMEBREW_PREFIX}/bin && \
    ln -s ${HOMEBREW_PREFIX}/Homebrew/bin/brew ${HOMEBREW_PREFIX}/bin/brew

USER root
RUN echo 'eval "$(/home/node/.linuxbrew/bin/brew shellenv)"' >> /etc/profile.d/brew.sh && \
    chmod 755 /etc/profile.d/brew.sh

# Install gogcli (Google OAuth CLI for Gmail skills)
RUN curl -fsSL https://github.com/steipete/gogcli/releases/download/v0.11.0/gogcli_0.11.0_linux_amd64.tar.gz | \
    tar xz -C /usr/local/bin gog && \
    chmod +x /usr/local/bin/gog

WORKDIR /app
RUN chown node:node /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node ui/package.json ./ui/package.json
COPY --chown=node:node patches ./patches
COPY --chown=node:node scripts ./scripts

USER node

# Set up pnpm global bin directory
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN mkdir -p ${PNPM_HOME} && \
    pnpm config set global-bin-dir ${PNPM_HOME} && \
    pnpm config set global-dir /home/node/.local/share/pnpm/global

# Add Homebrew to PATH for the node user
ENV PATH="/home/node/.linuxbrew/bin:${PATH}"

RUN pnpm install --frozen-lockfile

# install jq for remote-code
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends jq \
  && rm -rf /var/lib/apt/lists/*

# Optionally install Chromium and Xvfb for browser automation.
# Build with: docker build --build-arg OPENCLAW_INSTALL_BROWSER=1 ...
# Adds ~300MB but eliminates the 60-90s Playwright install on every container start.
# Must run after pnpm install so playwright-core is available in node_modules.
USER root
ARG OPENCLAW_INSTALL_BROWSER=""
RUN if [ -n "$OPENCLAW_INSTALL_BROWSER" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends xvfb && \
      mkdir -p /home/node/.cache/ms-playwright && \
      PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright \
      node /app/node_modules/playwright-core/cli.js install --with-deps chromium && \
      chown -R node:node /home/node/.cache/ms-playwright && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

USER node
COPY --chown=node:node . .
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV OPENCLAW_PREFER_PNPM=1
RUN pnpm ui:build

# Copy wacli from builder stage
USER root
COPY --from=wacli-builder /wacli-build/wacli /usr/local/bin/wacli
RUN chmod +x /usr/local/bin/wacli

ENV NODE_ENV=production

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER node

# Start gateway server with default config.
# Binds to loopback (127.0.0.1) by default for security.
#
# For container platforms requiring external health checks:
#   1. Set OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD env var
#   2. Override CMD: ["node","openclaw.mjs","gateway","--allow-unconfigured","--bind","lan"]
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]
