# Deploying Songa to songa.co.ke

Your application has been built and is ready for deployment.

## Deploy to Netlify

### Option 1: Using Netlify CLI (Recommended for Direct Deploy)

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy to production:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Follow the prompts to create a new site or link to existing
5. Once deployed, add custom domain `songa.co.ke` in Netlify dashboard

### Option 2: Connect Git Repository (Best for Continuous Deployment)

1. Create a repository on GitHub/GitLab/Bitbucket
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. Go to [Netlify](https://app.netlify.com) → New site from Git
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables
7. Deploy

### Option 3: Manual Drag & Drop

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop the `dist` folder from your project
3. Claim the site and configure domain

## Custom Domain Setup (songa.co.ke)

After deployment:

1. Purchase/register `songa.co.ke` domain
2. In Netlify Dashboard → Domain Settings → Add custom domain
3. Enter `songa.co.ke`
4. Configure DNS at your domain registrar:
   - **A Record**: `75.2.60.5` (Netlify load balancer)
   - **CNAME (www)**: Point to your Netlify URL

5. Netlify will auto-provision SSL certificate

## Environment Variables

Add these to Netlify (Site Settings → Environment Variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(Copy from your `.env` file)

## Build Info

Production build ready in `dist` folder:
- Optimized CSS: 15.07 kB
- Optimized JS: 309.02 kB
- Compressed and production-ready
