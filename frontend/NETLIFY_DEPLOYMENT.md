# Netlify Deployment Guide

Complete guide to deploy the Rider Telemetry frontend to Netlify with your custom subdomain.

## Prerequisites

- Netlify account (sign up at https://netlify.com)
- Your domain configured at your DNS provider
- Google Maps API key
- Backend server running and accessible at `https://oracle-apis.hardikgarg.me/ignition-hackathon`

## Step 1: Prepare the Frontend

1. **Update environment variables for production:**

   Create/update `frontend/.env`:
   ```env
   REACT_APP_API_URL=https://oracle-apis.hardikgarg.me/ignition-hackathon
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
   ```

2. **Test the build locally:**
   ```bash
   cd frontend
   npm run build
   ```
   
   Make sure there are no errors.

## Step 2: Push to Git (if not already done)

```bash
cd e:\Projects\ignition-hackathon
git add .
git commit -m "Prepare frontend for Netlify deployment"
git push origin main
```

## Step 3: Deploy to Netlify

### Method 1: Netlify CLI (Recommended)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Navigate to frontend folder:**
   ```bash
   cd e:\Projects\ignition-hackathon\frontend
   ```

4. **Initialize Netlify:**
   ```bash
   netlify init
   ```
   
   Select:
   - "Create & configure a new site"
   - Choose your team
   - Enter site name (e.g., `rider-telemetry`)
   - Build command: `npm run build`
   - Publish directory: `build`

5. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Method 2: Netlify Dashboard

1. **Login to Netlify Dashboard:**
   - Go to https://app.netlify.com/
   - Login with your account

2. **Import from Git:**
   - Click "Add new site" → "Import an existing project"
   - Connect to your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository
   - Select the branch (usually `main`)

3. **Configure build settings:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
   - Click "Deploy site"

## Step 4: Configure Environment Variables

In Netlify Dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add the following variables:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | `https://oracle-apis.hardikgarg.me/ignition-hackathon` |
   | `REACT_APP_GOOGLE_MAPS_API_KEY` | Your Google Maps API Key |

3. Click **Save**

4. **Trigger a new deploy:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

## Step 5: Configure Custom Domain

### Using Your Subdomain

1. **In Netlify Dashboard:**
   - Go to **Site settings** → **Domain management**
   - Click **Add custom domain**
   - Enter your subdomain (e.g., `telemetry.hardikgarg.me`)
   - Click **Verify**

2. **In Your DNS Provider (where your domain is hosted):**

   Add a CNAME record:
   ```
   Type: CNAME
   Name: telemetry (or your chosen subdomain)
   Value: your-netlify-site.netlify.app
   TTL: 3600
   ```

   Example for `telemetry.hardikgarg.me`:
   ```
   CNAME   telemetry   rider-telemetry.netlify.app
   ```

3. **Wait for DNS propagation:**
   - Can take 5 minutes to 48 hours
   - Usually happens within 30 minutes
   - Check status: https://dnschecker.org/

4. **Enable HTTPS:**
   - Netlify will automatically provision SSL certificate
   - Wait for "HTTPS" badge to show "Secured"

## Step 6: Configure CORS on Backend

Make sure your Flask backend allows requests from your Netlify domain.

Update `backend/server.py`:

```python
from flask_cors import CORS

# Update CORS configuration
CORS(app, origins=[
    "http://localhost:3000",  # Local development
    "https://telemetry.hardikgarg.me",  # Your Netlify domain
    "https://rider-telemetry.netlify.app"  # Default Netlify domain
])
```

Restart your backend server.

## Step 7: Test Deployment

1. **Visit your site:**
   - https://telemetry.hardikgarg.me (or your chosen subdomain)
   - https://rider-telemetry.netlify.app (default Netlify URL)

2. **Check functionality:**
   - [ ] Map loads correctly
   - [ ] Live data updates every 2 seconds
   - [ ] Activity status displays
   - [ ] Dashboard shows sensor data
   - [ ] Gyroscope visualization renders
   - [ ] Events panel loads
   - [ ] Telegram link modal works

3. **Check browser console:**
   - Should be no CORS errors
   - Should be no API connection errors
   - Check Network tab for successful API calls

## Netlify Configuration Files

### `netlify.toml` (already created)

Located at `frontend/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "build"
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures:
- Correct build command
- SPA routing works properly
- All routes redirect to index.html

## Continuous Deployment

Once connected to Git:

1. **Automatic deployments:**
   - Every push to `main` branch triggers a deploy
   - Takes 2-5 minutes typically

2. **Deploy previews:**
   - Pull requests get preview URLs
   - Test before merging

3. **Rollback:**
   - Go to **Deploys** tab
   - Click on any previous deploy
   - Click **Publish deploy** to rollback

## Monitoring

### Netlify Analytics (Optional, Paid)

- Go to **Site settings** → **Analytics**
- Enable Netlify Analytics
- View traffic, performance, bandwidth

### Build Status Badge

Add to your README.md:

```markdown
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)
```

Get the badge code from: **Site settings** → **Status badges**

## Troubleshooting

### Build Fails

1. **Check build logs** in Netlify dashboard
2. Common issues:
   - Missing dependencies: Run `npm install` locally
   - Environment variables not set
   - Node version mismatch

**Fix Node version:**

Create `frontend/.nvmrc`:
```
18
```

Or specify in `netlify.toml`:
```toml
[build.environment]
  NODE_VERSION = "18"
```

### CORS Errors

1. Check backend CORS configuration
2. Verify API_URL is correct
3. Check backend is accessible from internet
4. Check NGINX configuration allows requests

### API Not Loading

1. **Check environment variables** in Netlify
2. **Verify backend URL** is accessible:
   ```bash
   curl https://oracle-apis.hardikgarg.me/ignition-hackathon/health
   ```
3. **Check browser console** for errors
4. **Test API directly** with Postman

### Google Maps Not Loading

1. **Check API key** in environment variables
2. **Verify API key has Maps JavaScript API enabled**
3. **Check API key restrictions** (HTTP referrers)
4. Add your Netlify domain to allowed referrers:
   - https://telemetry.hardikgarg.me/*
   - https://rider-telemetry.netlify.app/*

### DNS Not Propagating

1. **Check DNS settings** with:
   ```bash
   nslookup telemetry.hardikgarg.me
   ```

2. **Verify CNAME record** points to Netlify:
   ```bash
   dig telemetry.hardikgarg.me CNAME
   ```

3. **Wait longer** - can take up to 48 hours
4. **Clear DNS cache:**
   ```bash
   ipconfig /flushdns  # Windows
   sudo dscacheutil -flushcache  # macOS
   ```

## Performance Optimization

### 1. Enable Compression

Already enabled in `netlify.toml` headers.

### 2. Asset Optimization

Netlify automatically:
- Minifies CSS, JS, HTML
- Compresses images
- Serves via CDN

### 3. Custom Headers

Add to `netlify.toml`:

```toml
[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Security Best Practices

1. **Never commit `.env` files** to Git
2. **Use environment variables** for all secrets
3. **Restrict API keys** to your domains only
4. **Enable HTTPS only** (disable HTTP)
5. **Set security headers** (already in netlify.toml)

## Local Testing Before Deploy

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Serve build locally:**
   ```bash
   npx serve -s build -l 3000
   ```

3. **Test with production API:**
   - Update `.env` temporarily to use production API
   - Test all functionality
   - Revert `.env` after testing

## Useful Commands

```bash
# Check build status
netlify status

# Open site in browser
netlify open:site

# Open admin dashboard
netlify open:admin

# View deploy logs
netlify deploy --prod

# List environment variables
netlify env:list

# Set environment variable
netlify env:set REACT_APP_API_URL "https://your-api.com"
```

## Production Checklist

Before going live:

- [ ] Backend server is running and accessible
- [ ] NGINX configured with SSL
- [ ] Database is set up and accessible
- [ ] Telegram bot is running
- [ ] ESP32s can reach backend API
- [ ] Environment variables set in Netlify
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] CORS configured correctly
- [ ] Google Maps API key valid
- [ ] All frontend features tested
- [ ] Mobile responsiveness verified
- [ ] Error handling tested
- [ ] 404 page works
- [ ] Browser console has no errors

## Support

- Netlify Docs: https://docs.netlify.com/
- Netlify Community: https://answers.netlify.com/
- Status Page: https://www.netlifystatus.com/

---

**Your deployment URL structure:**
- Frontend: https://telemetry.hardikgarg.me
- Backend API: https://oracle-apis.hardikgarg.me/ignition-hackathon
- Health Check: https://oracle-apis.hardikgarg.me/ignition-hackathon/health

Good luck with your hackathon! 🚀
