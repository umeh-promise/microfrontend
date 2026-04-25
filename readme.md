# Micro Frontend App (MFP)

A production-ready micro-frontend architecture built with Webpack 5 Module Federation. Four independently deployable applications work together as a single seamless product — with React and Vue 3 running side by side in the same browser.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Container                  │
│           (React 17 · port 8080)            │
│                                             │
│  ┌──────────┐ ┌──────┐ ┌─────────────────┐ │
│  │Marketing │ │ Auth │ │    Dashboard    │ │
│  │  React   │ │React │ │      Vue 3      │ │
│  │  :8081   │ │:8082 │ │     :8083       │ │
│  └──────────┘ └──────┘ └─────────────────┘ │
└─────────────────────────────────────────────┘
```

Each package is a standalone app that can run independently in development and is deployed independently in production. The container orchestrates them at runtime via Webpack Module Federation — no build-time coupling.

---

## Packages

| Package     | Framework | Port | Exposes          | Routes                         |
| ----------- | --------- | ---- | ---------------- | ------------------------------ |
| `container` | React 17  | 8080 | —                | All routes (shell)             |
| `marketing` | React 17  | 8081 | `./MarketingApp` | `/`, `/pricing`                |
| `auth`      | React 17  | 8082 | `./AuthApp`      | `/auth/signin`, `/auth/signup` |
| `dashboard` | Vue 3     | 8083 | `./DashboardApp` | `/dashboard`                   |

---

## Tech Stack

- **Webpack 5** — Module Federation for runtime integration
- **React 17** — Container, Marketing, Auth packages
- **Vue 3** — Dashboard package
- **Material UI v4** — UI components for React apps
- **PrimeVue 3** — UI components for the Vue dashboard
- **PrimeFlex / PrimeIcons** — Layout and icons for the dashboard
- **Chart.js 3** — Charts in the dashboard
- **React Router v5** — Client-side routing
- **Babel** — JS transpilation across all packages
- **GitHub Actions** — CI/CD pipeline per package
- **AWS S3 + CloudFront** — Production hosting and CDN

---

## Project Structure

```
mfp/
├── .github/
│   └── workflows/
│       ├── auth.yml
│       ├── container.yml
│       ├── dashboard.yml
│       └── marketing.yml
└── packages/
    ├── container/          # Shell app — mounts all micro-frontends
    │   ├── config/
    │   │   ├── webpack.common.js
    │   │   ├── webpack.dev.js
    │   │   └── webpack.prod.js
    │   └── src/
    │       ├── components/
    │       │   ├── AuthApp.js
    │       │   ├── DashboardApp.js
    │       │   ├── Header.js
    │       │   ├── MarketingApp.js
    │       │   └── Progress.js
    │       └── App.js
    ├── marketing/          # Landing and pricing pages (React)
    ├── auth/               # Sign in and sign up pages (React)
    └── dashboard/          # Analytics dashboard (Vue 3)
```

---

## Getting Started

### Prerequisites

- Node.js >= 14
- npm >= 6

### Installation

Each package manages its own dependencies. Install them separately:

```bash
cd packages/container && npm install
cd ../marketing && npm install
cd ../auth && npm install
cd ../dashboard && npm install
```

### Running in Development

Start each package in its own terminal. The order below is recommended so remotes are available before the container loads:

```bash
# Terminal 1 — Marketing (http://localhost:8081)
cd packages/marketing && npm start

# Terminal 2 — Auth (http://localhost:8082)
cd packages/auth && npm start

# Terminal 3 — Dashboard (http://localhost:8083)
cd packages/dashboard && npm start

# Terminal 4 — Container (http://localhost:8080)
cd packages/container && npm start
```

Open `http://localhost:8080` in your browser.

> Each package can also be opened directly on its own port for isolated development without the container.

### Building for Production

```bash
cd packages/container && npm run build
cd packages/marketing && npm run build
cd packages/auth && npm run build
cd packages/dashboard && npm run build
```

---

## How Module Federation Works

Each remote package exposes a `remoteEntry.js` file at its root. The container declares these as remotes in its webpack config and loads them at runtime:

**`packages/container/config/webpack.dev.js`**

```js
remotes: {
  marketing: "marketing@http://localhost:8081/remoteEntry.js",
  auth:      "auth@http://localhost:8082/remoteEntry.js",
  dashboard: "dashboard@http://localhost:8083/remoteEntry.js",
}
```

Each remote exposes a `mount` function that the container calls with a DOM element:

```js
// React remote (marketing / auth)
export const mount = (el, { initialPath, onNavigate, onSignIn }) => { ... }

// Vue remote (dashboard)
export const mount = (el) => {
  createApp(Dashboard).mount(el);
}
```

The container wraps each remote in a React component using a `ref`:

```jsx
export default function DashboardApp() {
  const ref = useRef(null);
  useEffect(() => {
    mount(ref.current);
  }, []);
  return <div ref={ref} />;
}
```

### Shared Dependencies

All packages declare their `dependencies` as shared modules in Module Federation. This prevents duplicate copies of React, Vue, etc. from being loaded in the browser.

---

## Routing

Routing is split between the container and each remote:

- The container uses `BrowserRouter` and owns the top-level routes (`/`, `/auth`, `/dashboard`)
- React remotes (marketing, auth) use a memory-based `Router` driven by the history object passed down from the container
- Navigation events are synced between the container and remotes via `onNavigate` / `onParentNavigate` callbacks
- The Vue dashboard has no sub-routes and is mounted directly

---

## CSS Class Name Isolation

Material UI generates class names that can collide when multiple React apps run on the same page. Each React package uses `StylesProvider` with a unique `productionPrefix` to prevent conflicts:

| Package   | Prefix |
| --------- | ------ |
| container | `co`   |
| marketing | `ma`   |
| auth      | `au`   |

---

## CI/CD Pipeline

Each package has its own GitHub Actions workflow that triggers only when files in its directory change. This means deploying the dashboard does not rebuild or redeploy the container.

### Workflow Steps (per package)

1. Checkout code
2. `npm install`
3. `npm run build` (with `PRODUCTION_DOMAIN` env var injected for the container)
4. Sync build output to S3: `aws s3 sync dist s3://<bucket>/<package>/latest`
5. Invalidate CloudFront cache for the updated path

### Required GitHub Secrets

| Secret                  | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | IAM user access key                                                           |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key                                                           |
| `AWS_DEFAULT_REGION`    | AWS region (e.g. `us-east-1`)                                                 |
| `AWS_S3_BUCKET_NAME`    | S3 bucket name                                                                |
| `AWS_DISTRIBUTION_ID`   | CloudFront distribution ID                                                    |
| `PRODUCTION_DOMAIN`     | Base URL of the CloudFront distribution (e.g. `https://d1234.cloudfront.net`) |

### S3 Bucket Layout

```
s3://<bucket>/
├── container/latest/
│   └── index.html
├── marketing/latest/
│   └── remoteEntry.js
├── auth/latest/
│   └── remoteEntry.js
└── dashboard/latest/
    └── remoteEntry.js
```

### CloudFront Configuration

- The distribution serves the S3 bucket as its origin
- `index.html` for the container is invalidated on every container deploy
- `remoteEntry.js` for each remote is invalidated on every remote deploy
- All routes fall back to `/container/latest/index.html` to support client-side routing

---

## Adding a New Micro-Frontend

1. Create a new package under `packages/` with its own `src/`, `config/`, and `public/`
2. Configure `ModuleFederationPlugin` in its webpack configs to expose a mount function
3. Add the remote to the container's `webpack.dev.js` and `webpack.prod.js`
4. Create a wrapper component in `packages/container/src/components/`
5. Add a route in `packages/container/src/App.js`
6. Add a GitHub Actions workflow under `.github/workflows/`

---

## Common Issues

**`Module not found: Can't resolve 'auth/AuthApp'`**
The remote is not listed in the container's webpack config, or the remote dev server is not running.

**`Unknown option: .preset`**
Typo in babel-loader options — use `presets` and `plugins` (plural).
