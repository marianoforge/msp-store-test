<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Coding Challenge - Medusa Application 
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

## Prerequisites

Before starting this coding challenge, ensure you have the following installed on your computer:

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Node.js** (version 20 or higher recommended)
- **npm** (comes with Node.js)

To verify your installations, run:

```bash
docker --version
docker compose version
node --version
npm --version
```

## Setup Instructions

Follow these steps carefully to set up your Medusa development environment:

### 1. Clone and Navigate to the Project

```bash
cd /path/to/medusa-store-mytest
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is required to resolve dependency conflicts.

### 3. Configure Environment Variables

Create your environment configuration file:

```bash
cp .env.template .env
```

The `.env` file contains essential configuration for your Medusa application, including CORS settings, Redis URL, and database configuration.

### 4. Start Medusa app

Start the Medusa app:

```bash
npm run docker:up
```

This will start your Medusa app, including the database and Redis. Automatically, it will seed your DB as well.

### 5. Create an Admin User

Create your first admin user to access the Medusa Admin dashboard:

```bash
docker compose run --rm medusa npx medusa user -e admin@example.com -p supersecret
```

The Medusa server will start on **http://localhost:9000**

### 6. Verify the Installation

#### Access the Admin Dashboard

1. Open your browser and navigate to: **http://localhost:9000/app**
2. Login with your credentials:
   - **Email:** `admin@example.com`
   - **Password:** `supersecret`
3. If you can access the dashboard, your setup is successful! 🎉

#### Get the Publishable API Key

1. In the Admin dashboard, go to: **Settings → Publishable API Keys**: http://localhost:9000/app/settings/publishable-api-keys
2. Copy the API key token
3. **Save this token** - you'll need it to connect your Storefront application

## Additional Resources

For more detailed information:

- [Medusa Documentation](https://docs.medusajs.com)
- [Installation Guide](https://docs.medusajs.com/learn/installation/docker)
- [System Requirements](https://docs.medusajs.com/learn/installation#get-started)

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`.

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
