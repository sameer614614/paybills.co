# Admin and Agent Console Deployment Guide

This document walks through the exact steps required to expose the admin and agent React builds on hardened subdomains while keeping the rest of the public site discoverable.

## 1. Prerequisites

* A GoDaddy VPS (Ubuntu 20.04+ is assumed here).
* SSH access to the VPS as a sudo-capable user.
* The project repository checked out on the server (for example `/var/www/paybillswithus.com`).
* An HTTPS certificate for each private subdomain (`admin.paybillswithus.com` and `agent.paybillswithus.com`). You can generate these with Let's Encrypt once DNS is in place.

## 2. DNS configuration

1. Sign in to your GoDaddy DNS dashboard.
2. Create two `A` records:
   * **Host:** `admin` – **Points to:** the public IP of your VPS.
   * **Host:** `agent` – **Points to:** the same VPS IP.
3. Allow DNS to propagate (this can take a few minutes). You can confirm from your laptop with:
   ```bash
   dig +short admin.paybillswithus.com
   dig +short agent.paybillswithus.com
   ```

## 3. Build the applications

On the VPS, prepare fresh production bundles:
```bash
cd /var/www/paybillswithus.com
npm install --prefix backend
npm install --prefix frontend
npm install --prefix admin
npm install --prefix agent
npm run build --prefix backend
npm run build --prefix frontend
npm run build --prefix admin
npm run build --prefix agent
```
The admin build will live in `admin/dist`, and the agent build in `agent/dist`.

## 4. Lock down API access by host

Edit `/var/www/paybillswithus.com/backend/.env` so the allowed host names match the DNS records you created:
```env
ADMIN_ALLOWED_HOSTS=admin.paybillswithus.com
AGENT_ALLOWED_HOSTS=agent.paybillswithus.com
```
Restart the API service (`pm2 restart paybills-api`, `systemctl restart paybills-backend`, or the process manager you use). The middleware in `backend/src/middleware/requireApprovedHost.ts` will now reject requests that do not present these host headers.

## 5. Serve the static bundles with Nginx

Install Nginx if it is not already available:
```bash
sudo apt update && sudo apt install nginx
```

Create a server block for the admin console at `/etc/nginx/sites-available/admin.paybillswithus.com`:
```nginx
server {
    listen 80;
    server_name admin.paybillswithus.com;

    # Optional: restrict to a trusted CIDR range (replace with your office IP block)
    allow 203.0.113.0/24;
    deny all;

    root /var/www/paybillswithus.com/admin/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Repeat for the agent console, adjusting the hostname, CIDR allow list, and root path:
```nginx
server {
    listen 80;
    server_name agent.paybillswithus.com;

    allow 203.0.113.0/24; # replace with agent network range
    deny all;

    root /var/www/paybillswithus.com/agent/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the sites and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/admin.paybillswithus.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/agent.paybillswithus.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

At this point the Vite bundles are available on the desired hostnames, but only from approved IP ranges.

## 6. Secure with HTTPS

Use Certbot to obtain certificates and redirect HTTP to HTTPS:
```bash
sudo apt install python3-certbot-nginx
sudo certbot --nginx -d admin.paybillswithus.com -d agent.paybillswithus.com
```
Certbot will rewrite the server blocks so that TLS is enforced.

## 7. Admin sign-in and agent provisioning

* Browse to `https://admin.paybillswithus.com` from an allowed IP.
* Log in with the hard-coded owner credentials:
  * **Username:** `sameer614614`
  * **Password:** `Cake@1245`
* Use the “Agents” section to create agent accounts (username/password pairs).
* Agents can then authenticate at `https://agent.paybillswithus.com` using the credentials you assign.

Because the backend is validating the `Host` header and you are allowing only trusted IP ranges in Nginx, random port scans or subdomain brute-force tools will be denied before they reach the React apps.

## 8. Troubleshooting tips

* Confirm the DNS records by running `dig` from both your laptop and the VPS.
* Check `/var/log/nginx/error.log` if you receive 403/404 responses unexpectedly.
* If the React UI loads but API calls fail with `403`, ensure the `ADMIN_ALLOWED_HOSTS`/`AGENT_ALLOWED_HOSTS` environment variables match the exact subdomain (no protocol, no trailing slash).
* If you are testing from an IP address outside your allow list, comment out the `allow`/`deny` directives temporarily and reload Nginx to verify the rest of the configuration.

Once these steps are complete, both consoles will be online, restricted to the expected hosts, and ready for production use.
