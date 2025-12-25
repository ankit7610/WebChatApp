# 🔧 TROUBLESHOOTING GUIDE

Common errors and their solutions.

---

## 🗄️ Database Errors

### Error: "MongooseServerSelectionError: Could not connect to any servers"

**Cause:** Cannot reach MongoDB Atlas

**Solutions:**
1. Check MongoDB URI is correct in `.env`
2. Verify Network Access in MongoDB Atlas:
   - Go to Atlas → Network Access
   - Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
3. Check username/password are correct
4. Ensure connection string includes database name: `...mongodb.net/chatapp?retryWrites=true`
5. Try URL-encoding special characters in password

**Test Connection:**
```bash
cd server
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected!')).catch(e => console.error(e));"
```

---

### Error: "User authentication failed"

**Cause:** Wrong MongoDB credentials

**Solutions:**
1. Go to Atlas → Database Access
2. Edit user or create new one
3. Copy password (or reset it)
4. Update connection string with correct credentials
5. Use URL encoding for special chars: `@` → `%40`, `#` → `%23`

---

## 🔴 Redis Errors

### Error: "Redis connection refused" or "ECONNREFUSED"

**Cause:** Cannot connect to Upstash Redis

**Solutions:**
1. Check `REDIS_URL` format: `redis://default:PASSWORD@ENDPOINT:6379`
2. Verify URL is from Upstash console (Redis tab)
3. Check for typos in URL
4. Ensure no extra spaces or quotes
5. Test in Upstash console (Data Browser)

**Test Connection:**
```bash
cd server
node -e "require('dotenv').config(); const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.on('connect', () => console.log('Connected!')); r.on('error', e => console.error(e));"
```

---

### Error: "Too many commands"

**Cause:** Exceeded Upstash free tier (10,000 commands/day)

**Solutions:**
1. Check usage in Upstash dashboard
2. Wait for daily reset (midnight UTC)
3. Optimize message sending (reduce unnecessary publishes)
4. Upgrade to paid plan if needed

---

## 🔥 Firebase Errors

### Error: "Firebase: Error (auth/invalid-api-key)"

**Cause:** Wrong Firebase API key

**Solutions:**
1. Go to Firebase Console → Project Settings
2. Copy correct API key from web app config
3. Update `VITE_FIREBASE_API_KEY` in client `.env`
4. Restart Vite dev server (`npm run dev`)

---

### Error: "Firebase: Error (auth/operation-not-allowed)"

**Cause:** Email/Password authentication not enabled

**Solutions:**
1. Go to Firebase Console → Authentication
2. Click Sign-in method tab
3. Enable Email/Password provider
4. Save and retry

---

### Error: "Invalid Firebase token" (Backend)

**Cause:** Wrong service account JSON

**Solutions:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key (downloads JSON)
3. Copy ENTIRE JSON content
4. Paste as single line in `FIREBASE_SERVICE_ACCOUNT`
5. Use single quotes: `FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'`
6. Restart backend server

---

## 🔌 WebSocket Errors

### Error: "WebSocket connection failed" (Frontend)

**Cause:** Cannot connect to WebSocket server

**Solutions:**
1. Check backend is running (`npm run dev` in server/)
2. Verify `VITE_WS_URL` in client `.env`
3. Local dev: Use `ws://localhost:3000`
4. Production: Use `wss://` (not `ws://`)
5. Check backend logs for errors

---

### Error: "WebSocket closed: 4001 Authentication required"

**Cause:** Invalid or missing JWT token

**Solutions:**
1. Clear localStorage: `localStorage.clear()` in browser console
2. Logout and login again
3. Check JWT is being stored: `localStorage.getItem('chatToken')`
4. Verify `JWT_SECRET` matches between login and WebSocket verification
5. Check token expiry (default 7 days)

---

### Error: "WebSocket closed: 1006 Abnormal closure"

**Cause:** Network issue or server crash

**Solutions:**
1. Check backend is running
2. Review backend logs for errors
3. Verify firewall/antivirus not blocking WebSocket
4. Check CORS configuration
5. Try different network (WiFi vs mobile)

---

## 🌐 CORS Errors

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Backend not allowing requests from frontend

**Solutions:**
1. Check `CLIENT_URL` in backend `.env`
2. Verify it matches your frontend URL exactly (no trailing slash)
3. Restart backend after changing `.env`
4. In development, use: `CLIENT_URL=http://localhost:5173`
5. In production, use your Vercel URL

**Update CORS in server/index.js if needed:**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
```

---

## 🔐 Authentication Errors

### Error: "Failed to authenticate with backend"

**Cause:** Backend cannot verify Firebase token

**Solutions:**
1. Check `FIREBASE_SERVICE_ACCOUNT` is correct
2. Verify it's valid JSON (use JSON validator)
3. Check backend logs for specific error
4. Ensure Firebase Admin SDK initialized successfully
5. Try regenerating service account key

---

### Error: "User not found after login"

**Cause:** User not saved to MongoDB

**Solutions:**
1. Check MongoDB connection is working
2. Review backend logs during login
3. Verify User model is correct
4. Check MongoDB Atlas for user document
5. Try creating new account

---

## ⚡ Performance Issues

### Issue: "Backend takes 30+ seconds to respond"

**Cause:** Render free tier cold start

**Solutions:**
1. This is normal for free tier (sleeps after inactivity)
2. First request wakes up the server
3. Wait ~30 seconds for first response
4. Subsequent requests will be fast
5. Upgrade to paid plan for always-on
6. Use cron job to ping every 14 minutes

---

### Issue: "Messages lag or appear slowly"

**Cause:** Network latency or server overload

**Solutions:**
1. Check network connection
2. Verify Redis pub/sub is working
3. Check Upstash dashboard for latency
4. Review backend logs for errors
5. Monitor CPU/memory usage
6. Consider Redis region closer to users

---

## 🎨 Frontend Issues

### Error: "Cannot find module './pages/Login'"

**Cause:** Missing file or wrong import path

**Solutions:**
1. Check file exists: `client/src/pages/Login.jsx`
2. Verify case-sensitive filename
3. Check file extension (.jsx not .js)
4. Restart Vite dev server
5. Clear Vite cache: `rm -rf client/node_modules/.vite`

---

### Error: "Tailwind CSS not working"

**Cause:** Tailwind not configured properly

**Solutions:**
1. Check `tailwind.config.js` exists
2. Verify `postcss.config.js` exists
3. Import Tailwind in `index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
4. Restart dev server
5. Clear browser cache

---

### Error: "Environment variables undefined"

**Cause:** Vite env variables not prefixed correctly

**Solutions:**
1. All Vite env vars must start with `VITE_`
2. Restart dev server after changing `.env`
3. Check `.env` file is in `client/` directory
4. Use `import.meta.env.VITE_*` not `process.env.*`

---

## 📦 Deployment Issues

### Render: "Build failed"

**Cause:** NPM install errors or missing dependencies

**Solutions:**
1. Check Render logs for specific error
2. Verify `package.json` is correct
3. Test build locally: `npm install` in server/
4. Check Node.js version compatibility
5. Clear Render build cache (redeploy)

---

### Render: "Application failed to respond"

**Cause:** Server crashes on startup

**Solutions:**
1. Check Render logs for crash reason
2. Verify all environment variables are set
3. Test connections (MongoDB, Redis, Firebase)
4. Check port binding (Render sets PORT automatically)
5. Ensure `PORT=process.env.PORT || 3000` in code

---

### Vercel: "Build failed"

**Cause:** Vite build errors

**Solutions:**
1. Check Vercel build logs
2. Test build locally: `npm run build` in client/
3. Fix any TypeScript/ESLint errors
4. Check all imports are correct
5. Verify `vercel.json` configuration

---

### Vercel: "404 on page refresh"

**Cause:** SPA routing not configured

**Solutions:**
1. Add `vercel.json` with rewrites:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
2. Redeploy Vercel app

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**Backend:**
```javascript
// Add to server/index.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

**Frontend:**
```javascript
// Add to websocket.js
console.log('WebSocket state:', this.ws.readyState);
console.log('Sending:', data);
```

### Check Environment Variables

**Backend:**
```bash
cd server
node -e "require('dotenv').config(); console.log(process.env)"
```

**Frontend:**
```javascript
// In browser console
console.log(import.meta.env);
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Test auth (after getting token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/messages
```

---

## 📞 Still Stuck?

1. Check service status pages:
   - [MongoDB Status](https://status.mongodb.com/)
   - [Render Status](https://status.render.com/)
   - [Vercel Status](https://www.vercel-status.com/)
   - [Firebase Status](https://status.firebase.google.com/)

2. Review documentation:
   - [README.md](README.md)
   - [QUICKSTART.md](QUICKSTART.md)
   - [DEPLOYMENT.md](DEPLOYMENT.md)

3. Search for error message in:
   - Service documentation
   - Stack Overflow
   - GitHub issues

---

**Most issues are environment variable related! Double-check all configs. 🔍**
