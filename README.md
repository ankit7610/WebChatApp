# 💬 Real-Time Chat Application

A production-ready, real-time web chat application built with modern technologies and deployed entirely on **FREE-TIER** services.

## 🎯 Features

✅ Real-time messaging with WebSocket  
✅ User authentication with Firebase  
✅ Message persistence with MongoDB  
✅ Multi-instance scaling with Redis pub/sub  
✅ JWT-based session management  
✅ Auto-reconnect on connection drop  
✅ Online user count  
✅ Clean, responsive UI  
✅ Zero cost deployment

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │  React + Vite + Tailwind CSS
│  (Vercel)   │  - Firebase Auth (client SDK)
└──────┬──────┘  - WebSocket connection
       │         - JWT storage
       │
       ├─── HTTP (REST API) ────┐
       │                         │
       └─── WebSocket ───────────┤
                                 │
                        ┌────────▼────────┐
                        │  Backend Server │  Node.js + Express + ws
                        │    (Render)     │  - REST API
                        └────────┬────────┘  - WebSocket server
                                 │           - Firebase Admin SDK
                                 │           - JWT generation
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
          ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
          │  MongoDB    │ │   Redis   │ │  Firebase   │
          │   Atlas     │ │  Upstash  │ │    Auth     │
          │ (Database)  │ │ (Pub/Sub) │ │ (Identity)  │
          └─────────────┘ └───────────┘ └─────────────┘
```

### 🔄 Message Flow

1. **User sends message** → Frontend captures input
2. **WebSocket send** → Message sent to backend via WebSocket
3. **JWT verification** → Backend validates user's JWT token
4. **Save to MongoDB** → Message persisted to database
5. **Publish to Redis** → Message published to Redis channel
6. **Fan-out** → All server instances receive message from Redis
7. **Broadcast** → Each server broadcasts to its connected WebSocket clients
8. **Display** → All users receive and display the message

---

## 🧱 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool (fast dev server)
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Firebase SDK** - Client authentication
- **WebSocket API** - Real-time communication

### Backend
- **Node.js + Express** - REST API server
- **ws** - WebSocket server library
- **JWT** - Stateless authentication
- **Mongoose** - MongoDB ODM
- **ioredis** - Redis client
- **Firebase Admin** - Token verification

### Infrastructure
- **MongoDB Atlas** (Free M0) - NoSQL database
- **Upstash Redis** (Free tier) - Pub/sub messaging
- **Firebase Auth** (Free tier) - User authentication
- **Vercel** (Free) - Frontend hosting
- **Render** (Free) - Backend hosting

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- npm or yarn installed
- Accounts created (see setup below)

### 1️⃣ Clone Repository
```bash
git clone <your-repo-url>
cd ChatApp
```

### 2️⃣ Backend Setup

```bash
cd server
npm install
```

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials (see [Service Setup](#service-setup) below).

### 3️⃣ Frontend Setup

```bash
cd ../client
npm install
```

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase config.

### 4️⃣ Run Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Open browser to `http://localhost:5173`

---

## 🔧 Service Setup

### 1. MongoDB Atlas (Database)

**👉 CREATE ACCOUNT:** https://cloud.mongodb.com/

**Steps:**
1. Sign up for free account
2. Create a **New Cluster** (M0 Free tier)
3. Choose cloud provider (AWS/GCP/Azure) and region
4. Wait for cluster to deploy (~3-5 minutes)
5. Click **Connect** → **Connect your application**
6. Copy connection string
7. Replace `<username>` and `<password>` with your credentials

**👉 PASTE KEY HERE:** `server/.env` → `MONGODB_URI`

**Security Setup:**
- Go to **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
- Or add your specific IP for better security

---

### 2. Upstash Redis (Pub/Sub)

**👉 CREATE ACCOUNT:** https://console.upstash.com/

**Steps:**
1. Sign up for free account
2. Click **Create Database**
3. Choose **Global** for best performance (or Regional)
4. Select **Redis** type
5. Copy the **Redis URL** (format: `redis://default:xxxxx@region.upstash.io:6379`)

**👉 PASTE KEY HERE:** `server/.env` → `REDIS_URL`

**Note:** Free tier includes 10,000 commands/day (enough for testing)

---

### 3. Firebase Authentication

**👉 CREATE ACCOUNT:** https://console.firebase.google.com/

**Steps:**

#### A) Create Firebase Project
1. Click **Add Project**
2. Enter project name → Continue
3. Disable Google Analytics (optional) → Create Project

#### B) Enable Authentication
1. Go to **Build** → **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method
4. Save

#### C) Get Client Config (for Frontend)
1. Project Overview → Settings ⚙️
2. Scroll to **Your apps** → Click Web icon `</>`
3. Register app with nickname
4. Copy the `firebaseConfig` object

**👉 PASTE KEYS HERE:** `client/.env` → Firebase variables

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
# ... etc
```

#### D) Get Service Account (for Backend)
1. Project Settings → **Service Accounts** tab
2. Click **Generate new private key**
3. Download JSON file
4. Copy the **ENTIRE JSON content** (as a single line)

**👉 PASTE KEY HERE:** `server/.env` → `FIREBASE_SERVICE_ACCOUNT`

**Important:** Escape the JSON or use single quotes in .env:
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
```

---

### 4. JWT Secret (Backend)

Generate a random secret key:

```bash
openssl rand -base64 32
```

**👉 PASTE KEY HERE:** `server/.env` → `JWT_SECRET`

---

## 📦 Deployment

### Deploy Backend to Render

**👉 CREATE ACCOUNT:** https://render.com/

**Steps:**
1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Select the repository
4. Configure:
   - **Name:** chat-app-backend
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add **Environment Variables** (from `server/.env`):
   - `MONGODB_URI`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT`
   - `CLIENT_URL` (will be your Vercel URL)
6. Click **Create Web Service**
7. Wait for deployment (~2-3 minutes)
8. Copy your service URL (e.g., `https://chat-app-backend.onrender.com`)

**Note:** Free tier sleeps after inactivity. First request may take 30s to wake up.

---

### Deploy Frontend to Vercel

**👉 CREATE ACCOUNT:** https://vercel.com/

**Steps:**
1. Click **Add New** → **Project**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables** (from `client/.env`):
   - All `VITE_FIREBASE_*` variables
   - `VITE_API_URL` → Your Render backend URL (https://...)
   - `VITE_WS_URL` → Your Render backend URL (wss://... - note: use `wss` not `ws`)
5. Click **Deploy**
6. Wait for deployment (~1-2 minutes)
7. Copy your Vercel URL

**Update Backend:**
- Go back to Render dashboard
- Update `CLIENT_URL` environment variable with your Vercel URL
- Restart the backend service

---

## 🧪 Testing

### Running Tests

**Frontend Tests (Playwright):**
```bash
cd client
npm test              # Run all tests
npm run test:ui       # Interactive UI mode
npm run test:headed   # See browser while running
```

**Backend Tests:**
```bash
cd server
npm test
```

### Manual Testing

1. Open your Vercel URL in a browser
2. Click **Sign up** and create an account
3. After signup, you'll be redirected to the chat
4. Open the same URL in another browser/incognito window
5. Create another account and login
6. Send messages between the two users
7. Verify real-time delivery

---

## 🔍 How It Works

### Authentication Flow

```
1. User enters email/password
2. Frontend → Firebase Auth → Creates user
3. Firebase returns ID token
4. Frontend → Backend API → Sends ID token
5. Backend → Firebase Admin → Verifies token
6. Backend → MongoDB → Saves/updates user
7. Backend → Frontend → Issues JWT token
8. Frontend stores JWT in localStorage
```

### WebSocket Connection

```
1. User authenticated (has JWT)
2. Frontend opens WebSocket: ws://server?token=JWT_TOKEN
3. Backend extracts token from query param
4. Backend verifies JWT
5. Backend stores user's WebSocket connection
6. Connection established ✅
```

### Message Sending

```
1. User types message and clicks Send
2. Frontend → WebSocket → Sends { type: 'message', text: '...' }
3. Backend receives message
4. Backend saves to MongoDB
5. Backend publishes to Redis channel
6. All backend instances receive from Redis
7. Each instance broadcasts to connected clients
8. All users receive message in real-time
```

### Redis Pub/Sub (Scaling)

Without Redis:
```
[User A] ← [Server 1] → [User B]
[User C] ← [Server 2] → [User D]  ❌ A & B can't talk to C & D
```

With Redis Pub/Sub:
```
[User A] ← [Server 1] ↘
[User B] ←            → [Redis] ← [Server 2] → [User C]
                                               → [User D]
✅ All users can communicate across servers
```

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to connect to MongoDB"
**Fix:**
- Check `MONGODB_URI` is correct
- Verify IP whitelist in MongoDB Atlas (Network Access)
- Ensure username/password are URL-encoded if they contain special characters

### Issue: "WebSocket connection failed"
**Fix:**
- Check backend is running and accessible
- Verify `VITE_WS_URL` points to correct server
- In production, use `wss://` (not `ws://`) for secure connections
- Check Render logs for backend errors

### Issue: "Firebase auth error"
**Fix:**
- Verify all Firebase config variables are correct
- Check Email/Password auth is enabled in Firebase Console
- Ensure `FIREBASE_SERVICE_ACCOUNT` is valid JSON

### Issue: "Messages not appearing in real-time"
**Fix:**
- Check Redis connection (backend logs)
- Verify `REDIS_URL` is correct
- Ensure WebSocket is connected (check frontend UI indicator)

### Issue: "Render service keeps sleeping"
**Fix:**
- Free tier sleeps after 15 minutes of inactivity
- First request takes ~30s to wake up
- Upgrade to paid plan for always-on service
- Or use a cron job to ping your service every 14 minutes

### Issue: "CORS error"
**Fix:**
- Verify `CLIENT_URL` in backend .env matches your frontend URL
- Check CORS configuration in `server/index.js`
- Ensure no trailing slashes in URLs

---

## 📊 Free Tier Limits

| Service | Free Tier Limit | Notes |
|---------|----------------|-------|
| **MongoDB Atlas** | 512 MB storage | Enough for ~500k messages |
| **Upstash Redis** | 10,000 commands/day | ~100 messages/minute continuously |
| **Firebase Auth** | Unlimited users | 100% free for auth |
| **Vercel** | 100 GB bandwidth | Plenty for personal projects |
| **Render** | 750 hours/month | Sleeps after inactivity |

---

## 🎨 Customization Ideas

- Add emoji picker
- Add file/image uploads (use Firebase Storage)
- Add private rooms/channels
- Add user avatars
- Add typing indicators
- Add message reactions
- Add user profiles
- Add message editing/deletion
- Add message search
- Add dark mode

---

## 📝 Project Structure

```
ChatApp/
├── client/                  # Frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   └── MessageBubble.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Chat.jsx
│   │   ├── services/        # API & WebSocket services
│   │   │   ├── firebase.js
│   │   │   ├── authService.js
│   │   │   └── websocket.js
│   │   ├── App.jsx          # Main app component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json          # Vercel deployment config
│   └── .env.example
│
├── server/                  # Backend
│   ├── config/              # Service configurations
│   │   ├── database.js      # MongoDB connection
│   │   ├── redis.js         # Redis client setup
│   │   └── firebase.js      # Firebase Admin SDK
│   ├── models/              # Database models
│   │   ├── User.js          # User schema
│   │   └── Message.js       # Message schema
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication endpoints
│   │   └── messages.js      # Message history API
│   ├── index.js             # Express server entry
│   ├── ws.js                # WebSocket server logic
│   ├── package.json
│   ├── render.yaml          # Render deployment config
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── ci.yml            # CI/CD pipeline
├── client/
│   ├── tests/                # Frontend E2E tests
│   └── ...
├── server/
│   ├── tests.js              # Backend tests
│   └── ...
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - feel free to use this project for learning or production.

---

## ⭐ Acknowledgments

- Built entirely with free-tier services
- Perfect for learning real-time web development
- Production-ready architecture
- No hidden costs

---

## 🎓 Learning Resources

- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [JWT Authentication](https://jwt.io/introduction)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [React Hooks](https://react.dev/reference/react)

---

**Built with ❤️ for the community**

**Happy Coding! 🚀**
