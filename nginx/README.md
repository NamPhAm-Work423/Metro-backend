## Nginx Production VPS Configuration

This repository contains a hardened Nginx configuration for running the Metro System microservices on a production VPS. The configuration is designed with security, performance, and resilience in mind.

---

## ✨ Features

- **Strict security**
  - Hides `server_tokens` (no version leak).
  - Denies access to dotfiles (`.git`, `.env`, etc.) and common secret file extensions.
  - Strong TLS settings (TLS 1.2/1.3 only, modern ciphers, OCSP stapling, secure curves).
  - HSTS enabled for all public domains (excluded on `localhost` for development).

- **Logging**
  - JSON structured access logs (`/var/log/nginx/access.log`).
  - Error logs at `warn` level (`/var/log/nginx/error.log`).
  - Includes timing and upstream metrics for observability.

- **Performance**
  - Keepalive connections for upstream services.
  - Gzip compression (JSON, JavaScript, CSS, XML, SVG, WebAssembly).
  - Request/connection rate limiting with explicit HTTP 429 responses.
  - Buffering tuned for API JSON payloads.

- **Resilience**
  - `proxy_next_upstream` enabled for transient upstream errors.
  - Graceful error pages for API Gateway and admin tools when unavailable.
  - Catch-all vhosts (`return 444`) drop connections for raw IP access or unknown hosts.

- **CORS Management**
  - Predefined allowlist (`metrohcm.io.vn`, `metro-system.vercel.app`, `localhost:3000/3001`).
  - Origin-specific headers injected at Nginx (avoids duplicates from upstream).
  - Webhooks (`/webhook/`) accept all origins but disable credentials.

- **Dedicated routes**
  - `/health` → API Gateway health endpoint.
  - `/v1/` → Core API traffic (rate-limited and CORS-enabled).
  - `/api-docs/` → Swagger UI with controlled CORS.
  - `/webhook/` → PayPal, Stripe, and other webhook providers (streamed requests).
  - `/grafana/`, `/prometheus/`, `/alertmanager/` → Monitoring tools.
  - `/mongo-express/`, `/redis-commander/`, `/pgadmin/` → Admin tools (graceful degradation).

---

## 📂 File Structure

```
nginx/
├── nginx.conf   # Main configuration (production hardened)
└── README.md    # Documentation
```

---

## ⚙️ Usage

### 1) Install Nginx (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nginx -y
```

### 2) Place configuration

Replace the default config with the hardened one in this repo:

```bash
sudo cp nginx.conf /etc/nginx/nginx.conf
```

Ensure certificates exist (via Let’s Encrypt):

```
/etc/letsencrypt/live/metrohcm.io.vn/fullchain.pem
/etc/letsencrypt/live/metrohcm.io.vn/privkey.pem
```

### 3) Test and reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Security Considerations

- **Default vhosts** (`return 444`) ensure raw IP scans and unknown hosts are dropped without response.
- **Dotfile & secrets protection** prevents source code/config leaks.
- **Rate limiting**
  - `/v1/` → 10 requests/s with burst 20 per client.
  - `/webhook/` → 20 requests/s with burst 50 per client.
- **Admin tools** are exposed but designed for graceful degradation. In production, restrict with IP allowlist or Basic Auth. Example:

```nginx
location ^~ /pgadmin/ {
    allow 203.0.113.0/24;   # office/VPN IPs
    deny all;
    proxy_pass http://pgadmin_upstream/;
}
```

---

## 🌍 Deployment Modes

- **Edge mode (default)**
  - Do not trust `X-Forwarded-For`.
  - Logs show the direct client IP.

- **Behind Cloudflare or a Load Balancer**
  - Replace resolver (`127.0.0.11`) with your LB/host DNS.
  - Add `set_real_ip_from` directives for LB/Cloudflare IP ranges.
  - Use:

```nginx
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

---

## 🧪 Testing

Check TLS:

```bash
curl -vkI https://metrohcm.io.vn/
```

Check health route:

```bash
curl -vk https://metrohcm.io.vn/health
```

Check rate limits:

```bash
ab -n 100 -c 20 https://metrohcm.io.vn/v1/
```

---

## 🚨 Known Limitations

- Error pages use `return <status> '<html>...</html>';` which requires a modern Nginx (≥ 1.19).
- If running outside Docker, replace resolver, for example:

```nginx
resolver 1.1.1.1 8.8.8.8 valid=10s;
```
