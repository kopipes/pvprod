# PVPROD VPS Deployment Notes

## IMPORTANT: Correct Path
- **App path:** `/opt/pvprod` (NOT `/var/www/pvprod`)
- **Service:** PM2 running from `/opt/pvprod/server.js`, app name `pvprod`, port 3001

## Host / SSH details
Infrastructure access details (host IP, SSH key, full deploy commands) are kept in
**`DEPLOY.local.md`** at the repo root — that file is **gitignored and not committed**.
Ask the project owner for it if you don't have it. Do not add host/SSH details back
into this tracked file.

## Deployment flow (summary)
```bash
# SSH to the VPS (see DEPLOY.local.md for host + key)
cd /opt/pvprod && git pull origin master
pm2 restart pvprod
# verify: git rev-parse HEAD  should match GitHub origin/master
```

## Common Issues
- Wrong path used initially: `/var/www/pvprod` ❌
- Correct path: `/opt/pvprod` ✅
