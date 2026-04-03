# 🚀 Deployment Strategy

## Overview

The system is split across two hosting environments:

| Component | Host | Cost |
|-----------|------|------|
| **Frontend** (React PWA) | Vercel (Free Tier) | $0 |
| **Backend** (Node.js API) | Toshiba Server (Home) | $0 (electricity only) |
| **Tunnel** (Public Access) | Cloudflare Tunnel (Free) | $0 |
| **Database** | PostgreSQL on Toshiba | $0 |
| **Total** | | **$0/month** |

---

## Frontend Deployment (Vercel)

### Why Vercel?
- Free tier includes: 100 GB bandwidth, unlimited deployments
- Automatic HTTPS
- Global CDN (fast from anywhere)
- Auto-deploy on Git push
- Perfect for React/Vite apps

### Setup Steps

1. **Push frontend to GitHub**:
   ```bash
   cd ~/SharifCloud-Sync/frontend
   git init
   git remote add origin https://github.com/<username>/sharifcloud-frontend.git
   git push -u origin main
   ```

2. **Connect Vercel to GitHub**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import the `sharifcloud-frontend` repository
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment Variables on Vercel**:
   ```
   VITE_API_URL=https://your-tunnel-domain.cloudflare.com/api
   VITE_API_KEY=your-secret-api-key
   ```

4. **Auto-Deploy**: Every `git push` to `main` triggers a new deployment.

### Vercel Free Tier Limits

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB / month |
| Deployments | Unlimited |
| Serverless Functions | 100 GB-hours |
| Build Time | 6000 min / month |

> For a single-user photo app, these limits will **never** be reached.

---

## Backend Deployment (Toshiba Server)

### Process Manager: PM2

Use **PM2** to keep the Node.js API running even after SSH disconnects or server reboots:

```bash
# Install PM2 globally
npm install -g pm2

# Start the API
cd ~/SharifCloud-Sync/backend
pm2 start src/server.js --name sharifcloud-api

# Save the process list (survives reboot)
pm2 save

# Auto-start PM2 on boot
pm2 startup
# ↑ This prints a command — copy and run it with sudo
```

### PM2 Useful Commands

```bash
pm2 status               # Check running processes
pm2 logs sharifcloud-api  # View logs
pm2 restart sharifcloud-api
pm2 stop sharifcloud-api
pm2 monit                 # Real-time monitoring dashboard
```

### Nginx Configuration

File: `/etc/nginx/sites-available/sharifcloud`

```nginx
server {
    listen 80;
    server_name localhost;

    # Max upload size (25 MB)
    client_max_body_size 25M;

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Timeout for large uploads
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sharifcloud /etc/nginx/sites-enabled/
sudo nginx -t          # Test config
sudo systemctl reload nginx
```

---

## Remote Connectivity (Cloudflare Tunnel)

### Why Cloudflare Tunnel?
- **Free** — no subscription needed
- **No port forwarding** — doesn't expose your home router
- **Handles dynamic IP** — your home ISP can change your IP anytime
- **Built-in DDoS protection**
- **Automatic HTTPS**

### Setup Steps

1. **Create Cloudflare account** at [cloudflare.com](https://cloudflare.com)

2. **Install `cloudflared` on Toshiba Server**:
   ```bash
   # Download and install
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb

   # Authenticate
   cloudflared tunnel login
   # ↑ Opens a browser to authorize

   # Create a tunnel
   cloudflared tunnel create sharifcloud

   # Configure the tunnel
   nano ~/.cloudflared/config.yml
   ```

3. **Tunnel Configuration** (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: sharifcloud.yourdomain.com
       service: http://localhost:80
     - service: http_status:404
   ```

4. **Run as a service**:
   ```bash
   sudo cloudflared service install
   sudo systemctl enable cloudflared
   sudo systemctl start cloudflared
   ```

5. **DNS Setup**: Add a CNAME record in Cloudflare DNS:
   ```
   sharifcloud.yourdomain.com → <TUNNEL_ID>.cfargotunnel.com
   ```

> **Note**: If you don't have a domain, you can use Cloudflare's free `*.trycloudflare.com` subdomain for quick testing.

---

## Full Request Path

```
📱 Phone Browser
    │
    ▼
Vercel CDN (React PWA)
    │
    ▼ (API call)
https://sharifcloud.yourdomain.com/api/photos/upload
    │
    ▼
Cloudflare Tunnel (encrypted)
    │
    ▼
Nginx :80 (Toshiba Server — reverse proxy)
    │
    ▼
Node.js :3000 (Express API)
    │
    ├──▶ Filesystem (save photo)
    └──▶ PostgreSQL (save metadata)
```

---

## Startup Checklist (After Server Reboot)

All services should auto-start, but verify with:

```bash
# 1. Check PostgreSQL
sudo systemctl status postgresql    # Should be: active

# 2. Check Nginx
sudo systemctl status nginx         # Should be: active

# 3. Check Node.js API
pm2 status                          # Should be: online

# 4. Check Cloudflare Tunnel
sudo systemctl status cloudflared   # Should be: active

# 5. Test end-to-end
curl https://sharifcloud.yourdomain.com/api/health
# Expected: {"status":"online",...}
```

---

> **Next**: [Implementation Plan →](../06-roadmap/implementation-plan.md)
