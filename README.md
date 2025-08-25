# URL Shortener - LinkSnap

A modern URL shortener with analytics, built with React frontend and Node.js backend.

## 🚀 Deployment Guide

### Backend Deployment

1. **Update Environment Variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```
   
   Update your `.env` file with production values:
   ```env
   MONGO_URI=your-mongodb-connection-string
   BASE=https://your-backend-domain.com
   FRONTEND_URL=https://your-frontend-domain.com
   NODE_ENV=production
   ADMIN_KEY=your-secure-admin-key
   ```

2. **Deploy to Platform** (Heroku, Railway, Render, etc.)
   - Set environment variables in your platform's dashboard
   - Deploy the `/be` folder

### Frontend Deployment

1. **Update Environment Variables**
   Create/update `fe/.env`:
   ```env
   VITE_API_URL=https://your-backend-domain.com
   ```

2. **Deploy to Platform** (Netlify, Vercel, etc.)
   - Set `VITE_API_URL` environment variable in your platform's dashboard
   - Deploy the `/fe` folder

## 🔧 Local Development

### Backend
```bash
cd be
npm install
npm start
```

### Frontend
```bash
cd fe
npm install
npm run dev
```

## 📝 API Endpoints

- `POST /api/shorten` - Create short URL
- `GET /api/analytics/:shortcode` - Get URL analytics
- `GET /:shortcode` - Redirect to original URL
- `GET /api/health` - Health check

## 🔐 Admin Endpoints

- `GET /api/admin/urls` - List all URLs
- `DELETE /api/admin/urls/:id` - Delete URL
- `GET /api/admin/stats` - Get statistics

## 🛠️ Common Deployment Issues

1. **Network Errors**: Ensure CORS is configured with your frontend domain
2. **Environment Variables**: Double-check all required env vars are set
3. **Database Connection**: Verify MongoDB URI is accessible from your deployment platform
