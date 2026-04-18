# URL Shortener on Cloudflare Workers

A simple URL shortening service using Cloudflare Workers + Workers KV.

---

## Overview

This Worker provides the following two features:

- Issue shortened URLs with `POST /api/shorten`
- Redirect to the original URL with `GET /<short key>`

In the implementation, shortened data is stored in KV. Also, CORS allowed domains are controlled by the `CORS_DOMAIN` environment variable.

---

## Prerequisites

- Node.js 18 or later (recommended)
- Cloudflare account
- Wrangler CLI (available with `npx wrangler ...` after `npm install`)

---

## Setup

```bash
npm install
```

For local development:

```bash
npm run dev
```

---

## Deployment to Cloudflare

---

### 1) Fork this repository
First, fork this repository.

---

### 2) Create a Worker based on the forked repository
Next, from Cloudflare's `Workers & Pages` settings screen,
Click `Create an application` > `Continue with GitHub`.

Then, link your GitHub account and bind the repository to Cloudflare Workers.

This completes the continuous deployment (CD) setup, where pushes to the repository are automatically deployed to Cloudflare Workers.

Reference: [Deploy Cloudflare Workers triggered by GitHub commits \(Accessed: Sat Apr 18 2026\)](https://zenn.dev/ss49919201/articles/04fd9f51170f92)

---

### 3) Set the Worker environment variable `CORS_DOMAIN` used at runtime

Just setting up continuous deployment for the Worker is not enough; you will get an "origin verification error" and cannot use it.
Therefore, you need to set the **official domain** where the application is running in the environment variables.

First, open the `Workers` settings page.

Then, from the domain list in the `Domains and Routes` section, select **one** domain you mainly want to use.

Next, in the `Variables and Secrets` section, click the `+ Add` button on the upper right, and set as follows.

| Type | Variable Name | Value |
|------|---------------|-------|
| Text | `CORS_DOMAIN` | `<selected domain>` |

Finally, click the `Deploy` button.

Reference: [Environment variables · Cloudflare Workers docs \(Accessed: Sat Apr 18 2026\)](https://developers.cloudflare.com/workers/configuration/environment-variables/#add-environment-variables-via-the-dashboard)

---

## Usage of the deployed program

In these instructions, replace `WORKER_URL` with the actual deployed URL.

---

### 1) Shorten a URL

Access `WORKER_URL` from your browser.

Enter the URL you want to shorten in the URL input field and press the "Shorten URL" button.

The shortened URL and QR code will be generated.

---

Alternatively, access `WORKER_URL` like `https://<worker-name>.<subdomain>.workers.dev/#https%3A%2F%2Fexample.com`,
with the URL included in the hash.

A shortened URL and QR code will be generated immediately.

---

### 2) Access the shortened URL to redirect

Access the issued `shortUrl` to be redirected to the original URL.
