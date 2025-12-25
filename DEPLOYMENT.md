# 📋 DEPLOYMENT CHECKLIST

Use this checklist to deploy your chat app to production.

## ✅ Pre-Deployment Checklist

### MongoDB Atlas
- [ ] Account created at https://cloud.mongodb.com/
- [ ] Free M0 cluster created
- [ ] Database user created with password
- [ ] Network access configured (IP whitelist)
- [ ] Connection string copied
- [ ] Connection string tested locally

### Upstash Redis
- [ ] Account created at https://console.upstash.com/
- [ ] Redis database created (Global or Regional)
- [ ] Redis URL copied
- [ ] Connection tested locally

### Firebase
- [ ] Project created at https://console.firebase.google.com/
- [ ] Email/Password authentication enabled
- [ ] Web app registered
- [ ] Client config copied (API key, etc.)
- [ ] Service account JSON downloaded
- [ ] Authentication tested locally

### Local Testing
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] User can sign up
- [ ] User can login
- [ ] Messages send in real-time
- [ ] Multiple users can chat
- [ ] WebSocket auto-reconnects
- [ ] User count updates correctly

---

## 🚀 Backend Deployment (Render)

### Render Account Setup
- [ ] Account created at https://render.com/
- [ ] GitHub repository connected
- [ ] Repository contains latest code

### Render Web Service Configuration
- [ ] New Web Service created
- [ ] Repository selected
- [ ] **Root Directory:** `server`
- [ ] **Environment:** Node
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`

### Environment Variables (Render)
- [ ] `MONGODB_URI` - [paste your MongoDB connection string]
- [ ] `REDIS_URL` - [paste your Upstash Redis URL]
- [ ] `JWT_SECRET` - [paste your JWT secret]
- [ ] `FIREBASE_SERVICE_ACCOUNT` - [paste Firebase service account JSON]
- [ ] `CLIENT_URL` - [will add after Vercel deployment]
- [ ] `PORT` - [optional, Render sets automatically]

### Deploy & Verify
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (~2-3 mins)
- [ ] Check logs for startup messages
- [ ] Copy service URL (e.g., https://your-app.onrender.com)
- [ ] Test health endpoint: https://your-app.onrender.com/health

---

## 🚀 Frontend Deployment (Vercel)

### Vercel Account Setup
- [ ] Account created at https://vercel.com/
- [ ] GitHub repository connected

### Vercel Project Configuration
- [ ] New Project created
- [ ] Repository imported
- [ ] **Framework Preset:** Vite
- [ ] **Root Directory:** `client`
- [ ] **Build Command:** `npm run build` (auto-detected)
- [ ] **Output Directory:** `dist` (auto-detected)

### Environment Variables (Vercel)
- [ ] `VITE_FIREBASE_API_KEY` - [from Firebase Console]
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - [from Firebase Console]
- [ ] `VITE_FIREBASE_PROJECT_ID` - [from Firebase Console]
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - [from Firebase Console]
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - [from Firebase Console]
- [ ] `VITE_FIREBASE_APP_ID` - [from Firebase Console]
- [ ] `VITE_API_URL` - [your Render backend URL with https://]
- [ ] `VITE_WS_URL` - [your Render backend URL with wss://]

**⚠️ Important:** For WebSocket, use `wss://` (not `ws://`)

### Deploy & Verify
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~1-2 mins)
- [ ] Copy Vercel URL (e.g., https://your-app.vercel.app)

---

## 🔄 Update Backend CORS

### Add Frontend URL to Backend
- [ ] Go to Render dashboard
- [ ] Open your web service
- [ ] Go to Environment variables
- [ ] Update `CLIENT_URL` with your Vercel URL
- [ ] Trigger manual deploy or wait for auto-redeploy

---

## 🧪 Production Testing

### Test Full Flow
- [ ] Open Vercel URL in browser
- [ ] Sign up with new account
- [ ] Verify redirect to chat page
- [ ] Send a test message
- [ ] Open second browser/incognito window
- [ ] Create second account
- [ ] Verify both users can chat
- [ ] Check WebSocket connection indicator (green dot)
- [ ] Verify online user count shows 2
- [ ] Close one browser tab
- [ ] Verify user count updates to 1
- [ ] Test message persistence (refresh page)

### Performance Checks
- [ ] Backend cold start time acceptable (~30s first request)
- [ ] Frontend loads quickly
- [ ] Messages appear instantly
- [ ] No console errors
- [ ] Mobile responsive

---

## 🔐 Security Checklist

- [ ] `.env` files NOT committed to Git
- [ ] `.gitignore` includes `.env`
- [ ] JWT secret is strong (32+ characters)
- [ ] MongoDB user has limited permissions
- [ ] Firebase security rules reviewed
- [ ] CORS limited to specific origin (not `*`)
- [ ] Environment variables only in deployment platforms

---

## 📊 Monitoring & Maintenance

### Setup Monitoring
- [ ] Render dashboard bookmarked
- [ ] Vercel dashboard bookmarked
- [ ] MongoDB Atlas dashboard bookmarked
- [ ] Upstash dashboard bookmarked

### Regular Checks
- [ ] Monitor Upstash usage (10k commands/day limit)
- [ ] Monitor MongoDB storage (512 MB limit)
- [ ] Check Render logs for errors
- [ ] Verify app wakes up from Render sleep (~30s)

### Optimization Tips
- [ ] Add uptime monitoring (e.g., UptimeRobot)
- [ ] Consider cron job to keep Render awake
- [ ] Monitor error rates
- [ ] Collect user feedback

---

## 🎉 Launch Checklist

- [ ] All services deployed and running
- [ ] Production testing passed
- [ ] Security checks completed
- [ ] Monitoring setup
- [ ] Share app URL with users
- [ ] Document any custom changes
- [ ] Celebrate! 🎊

---

## 📞 Support Resources

**Documentation:**
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Upstash Docs](https://docs.upstash.com/)

**Troubleshooting:**
- See [README.md - Common Issues](README.md#common-issues--fixes)
- Check service-specific logs
- Review environment variables

---

**Deployment Complete! 🚀**
