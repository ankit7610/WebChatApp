# 🚀 QUICK START GUIDE

Follow these steps to get the chat app running locally in under 10 minutes!

## ⚡ Prerequisites
- Node.js 18+ installed
- Git installed
- A code editor (VS Code recommended)

## 📋 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Create Environment Files

**Backend (.env):**
```bash
cd server
cp .env.example .env
```

**Frontend (.env):**
```bash
cd ../client
cp .env.example .env
```

### Step 3: Setup Services (Links Below)

You need to create FREE accounts and get API keys for:

1. **MongoDB Atlas** - https://cloud.mongodb.com/
2. **Upstash Redis** - https://console.upstash.com/
3. **Firebase** - https://console.firebase.google.com/

**⏱️ Time Required:** ~15 minutes total

See detailed instructions in [README.md](README.md#service-setup)

### Step 4: Fill in Environment Variables

**Server `.env` file needs:**
- `MONGODB_URI` (from MongoDB Atlas)
- `REDIS_URL` (from Upstash)
- `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- `FIREBASE_SERVICE_ACCOUNT` (from Firebase Console)

**Client `.env` file needs:**
- `VITE_FIREBASE_API_KEY` (from Firebase Console)
- `VITE_FIREBASE_AUTH_DOMAIN` (from Firebase Console)
- `VITE_FIREBASE_PROJECT_ID` (from Firebase Console)
- `VITE_FIREBASE_STORAGE_BUCKET` (from Firebase Console)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (from Firebase Console)
- `VITE_FIREBASE_APP_ID` (from Firebase Console)

### Step 5: Run the Application

**Terminal 1 - Start Backend:**
```bash
cd server
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
✅ Redis publisher connected
✅ Redis subscriber connected
✅ Firebase Admin initialized
✅ WebSocket server initialized
✅ Server running on port 3000
```

**Terminal 2 - Start Frontend:**
```bash
cd client
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 6: Test the App

1. Open `http://localhost:5173` in your browser
2. Click **Sign up** and create a test account
3. Open another browser window (or incognito)
4. Create another account
5. Send messages between them
6. Watch real-time delivery! 🎉

---

## 🐛 Troubleshooting

**Backend won't start?**
- Check all environment variables are set
- Verify MongoDB connection string format
- Ensure Redis URL is correct

**Frontend shows errors?**
- Check backend is running on port 3000
- Verify Firebase config is correct
- Check browser console for specific errors

**WebSocket won't connect?**
- Ensure backend is running
- Check JWT token is being generated
- Verify CORS settings

---

## 📚 Next Steps

- Read the full [README.md](README.md) for deployment instructions
- Customize the UI in `client/src/pages/Chat.jsx`
- Add new features (see README for ideas)
- Deploy to production (Vercel + Render)

---

**Need Help?** Check the [Common Issues section](README.md#common-issues--fixes) in README.md

**Happy Chatting! 💬**
