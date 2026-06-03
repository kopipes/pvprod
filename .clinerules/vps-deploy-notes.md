# PVPROD VPS Deployment Notes

## IMPORTANT: Correct Path
- **App path:** `/opt/pvprod` (NOT `/var/www/pvprod`)
- **Service:** PM2 running from `/opt/pvprod/server.js`

## Deployment Steps
```bash
# 1. SSH to VPS
ssh -i ~/.ssh/id_ed25519 root@72.62.124.109

# 2. Deploy to correct path
cd /opt/pvprod && git pull origin master

# 3. Restart PM2 service
pm2 restart pvprod

# 4. Verify
pm2 show pvprod | grep script path
```

## Common Issues
- Wrong path used initially: `/var/www/pvprod` ❌
- Correct path: `/opt/pvprod` ✅