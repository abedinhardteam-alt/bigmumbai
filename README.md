# bigmumbai

Full SPA clone of https://www.bigmumbaie.com (tenant ar041), Vercel-ready like dkwin.

## Import on Vercel
1. New Project → Import GitHub repo `abedinhardteam-alt/bigmumbai`
2. Framework Preset: Other
3. Root Directory: `./` (repo root)
4. Deploy

Live after deploy: `https://<project>.vercel.app/#/register?invitationCode=32411341644`

## How it works
- `middleware.js` proxies `/api/*` to `https://BigMumbaiapi.com` with Origin/Referer/Ar-Origin `https://www.bigmumbaie.com`
- `index.html` sets `VITE_API_URL` to `location.origin` (same-origin API)
- `web/config.js` has `checkApiDomain: false`
- `vercel.json` SPA fallback to `index.html`
- `custom-balance.js` injected on the login/home shell
