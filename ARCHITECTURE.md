# 🏗️ ARCHITECTURE DIAGRAMS

Visual representation of the chat application architecture.

---

## 🌐 High-Level System Architecture

```
                    Internet
                       │
        ┌──────────────┴──────────────┐
        │                             │
    [Vercel]                      [Render]
  Frontend CDN                   Backend Server
        │                             │
        │                             │
┌───────▼──────────┐         ┌────────▼────────┐
│  React SPA       │◄───────►│  Express Server │
│  + WebSocket     │  HTTP   │  + WebSocket    │
│  Client          │  WSS    │  Server         │
└──────────────────┘         └────────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
            │   MongoDB    │  │    Redis    │  │  Firebase   │
            │    Atlas     │  │   Upstash   │  │    Auth     │
            │ (Database)   │  │  (Pub/Sub)  │  │ (Identity)  │
            └──────────────┘  └─────────────┘  └─────────────┘
```

---

## 🔐 Authentication Flow

```
1. User Registration
━━━━━━━━━━━━━━━━━

[User]
  │
  │ 1. Enter email/password
  ▼
[React App]
  │
  │ 2. createUserWithEmailAndPassword()
  ▼
[Firebase Auth]
  │
  │ 3. User created, returns ID token
  ▼
[React App]
  │
  │ 4. POST /api/auth/login { firebaseToken }
  ▼
[Express Server]
  │
  │ 5. Verify token with Firebase Admin SDK
  ▼
[Firebase Admin]
  │
  │ 6. Token valid, extract user info
  ▼
[Express Server]
  │
  │ 7. Create/update user in MongoDB
  ▼
[MongoDB]
  │
  │ 8. User saved
  ▼
[Express Server]
  │
  │ 9. Generate JWT token
  │ 10. Return { token, user }
  ▼
[React App]
  │
  │ 11. Store JWT in localStorage
  │ 12. Navigate to /chat
  ▼
[Chat Page]
```

---

## 💬 Message Flow (Real-Time)

```
Multi-Instance WebSocket Architecture with Redis Pub/Sub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    [Redis Pub/Sub Channel]
                            │
            ┌───────────────┼───────────────┐
            │ subscribe     │ subscribe     │
            │               │               │
    ┌───────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
    │  Server 1    │  │ Server 2  │  │ Server 3  │
    │  (Render)    │  │ (Backup)  │  │ (Backup)  │
    └───┬──────┬───┘  └─┬──────┬──┘  └─┬──────┬──┘
        │      │        │      │        │      │
       WS     WS       WS     WS       WS     WS
        │      │        │      │        │      │
      User1  User2    User3  User4    User5  User6


Message Flow:
━━━━━━━━━━━━

1. User1 sends message via WebSocket
   ↓
2. Server 1 receives message
   ↓
3. Server 1 saves to MongoDB
   ↓
4. Server 1 publishes to Redis channel
   ↓
5. Redis broadcasts to ALL servers
   ↓
6. All servers receive message from Redis
   ↓
7. Each server broadcasts to its connected clients
   ↓
8. ALL users (User1-6) receive message in real-time ✅
```

---

## 🔌 WebSocket Connection Lifecycle

```
[User Opens Chat Page]
         │
         │ Has JWT?
         ├─ No ──► Redirect to /login
         │
         │ Yes
         ▼
[Initiate WebSocket]
         │
         │ ws://server?token=JWT_TOKEN
         ▼
[Backend WebSocket Server]
         │
         │ Extract token from query param
         ▼
[Verify JWT]
         │
    ┌────┴────┐
    │         │
  Valid    Invalid
    │         │
    │         └──► Close connection (code 4001)
    │
    ▼
[Store Connection]
  clients.set(userId, ws)
    │
    ▼
[Broadcast User Count]
    │
    ▼
[Listen for Messages]
    │
    ├──► on('message')
    │      └──► Save to MongoDB
    │      └──► Publish to Redis
    │      └──► Broadcast to all clients
    │
    ├──► on('close')
    │      └──► Remove from clients map
    │      └──► Update user count
    │
    └──► on('error')
           └──► Log error
           └──► Handle cleanup
```

---

## 🗄️ Database Schema

```
MongoDB Collections
━━━━━━━━━━━━━━━━━━

┌─────────────────────┐
│   users             │
├─────────────────────┤
│ _id: ObjectId       │ ◄─┐
│ firebaseUid: String │   │
│ email: String       │   │
│ displayName: String │   │
│ createdAt: Date     │   │
└─────────────────────┘   │
                          │
                          │ ref
                          │
┌─────────────────────┐   │
│   messages          │   │
├─────────────────────┤   │
│ _id: ObjectId       │   │
│ userId: ObjectId    │ ──┘
│ username: String    │
│ text: String        │
│ createdAt: Date     │ (indexed)
└─────────────────────┘
```

---

## 🚀 Deployment Architecture

```
                    [Users]
                       │
                       │ HTTPS
                       ▼
                  [Vercel CDN]
                   (Frontend)
                       │
        ┌──────────────┴──────────────┐
        │                             │
       HTTP                          WSS
        │                             │
        ▼                             ▼
  [REST API]                   [WebSocket]
        │                             │
        └──────────┬──────────────────┘
                   │
              [Render Server]
              Node.js Backend
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    [MongoDB]  [Redis]  [Firebase]
    (Atlas)   (Upstash)   (Auth)
```

---

## 📊 Data Flow Diagram

```
Registration/Login Flow:
━━━━━━━━━━━━━━━━━━━━━━

    Frontend                Backend                Services
       │                       │                      │
       │ Firebase Auth         │                      │
       ├──────────────────────┼──────────────────────►Firebase
       │                       │                      │
       │ ID Token              │                      │
       ◄──────────────────────┼──────────────────────┤
       │                       │                      │
       │ POST /auth/login      │                      │
       ├──────────────────────►                       │
       │                       │ Verify Token         │
       │                       ├─────────────────────►Firebase Admin
       │                       │                      │
       │                       │ User Info            │
       │                       ◄──────────────────────┤
       │                       │                      │
       │                       │ Save User            │
       │                       ├─────────────────────►MongoDB
       │                       │                      │
       │                       │ Generate JWT         │
       │                       │                      │
       │ JWT Token             │                      │
       ◄───────────────────────┤                      │
       │                       │                      │


Chat Message Flow:
━━━━━━━━━━━━━━━━

    User A                   Backend                User B
       │                       │                      │
       │ Send Message (WS)     │                      │
       ├──────────────────────►│                      │
       │                       │ Save                 │
       │                       ├────────►MongoDB      │
       │                       │                      │
       │                       │ Publish              │
       │                       ├────────►Redis        │
       │                       │                      │
       │                       │ Subscribe            │
       │                       ◄────────┤             │
       │                       │                      │
       │ Broadcast (WS)        │ Broadcast (WS)       │
       ◄───────────────────────┤──────────────────────►│
       │                       │                      │
```

---

## 🔧 Component Architecture (Frontend)

```
┌─────────────────────────────────────────┐
│             App.jsx                     │
│  (Router + Protected Routes)            │
└────────────┬────────────────────────────┘
             │
   ┌─────────┼─────────┐
   │         │         │
   ▼         ▼         ▼
┌─────┐  ┌──────┐  ┌──────┐
│Login│  │Signup│  │ Chat │
└──┬──┘  └───┬──┘  └───┬──┘
   │         │          │
   │         │          ├──► MessageBubble Component
   │         │          │
   └─────────┴──────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
  ┌──────────┐ ┌──────────┐
  │  Auth    │ │WebSocket │
  │ Service  │ │ Service  │
  └────┬─────┘ └─────┬────┘
       │             │
       ▼             ▼
  [Firebase]    [Backend WS]
```

---

## 🔄 State Management Flow

```
localStorage
     │
     ├─► chatToken (JWT)
     └─► chatUser (User object)
          │
          ├─► Used by: AuthService
          ├─► Used by: WebSocket Connection
          └─► Used by: Protected Routes


React State (Chat Component)
     │
     ├─► messages: Message[]
     ├─► inputText: string
     ├─► userCount: number
     ├─► connected: boolean
     └─► error: string

     ↓ (Updated by)

WebSocket Events
     │
     ├─► 'message' → Add to messages
     ├─► 'user_count' → Update userCount
     ├─► 'open' → Set connected=true
     ├─► 'close' → Set connected=false
     └─► 'error' → Set error message
```

---

## 🌍 Geographic Distribution (Free Tier)

```
         [Users Worldwide]
                │
    ┌───────────┼───────────┐
    │           │           │
  User-A     User-B      User-C
(US West)   (Europe)    (Asia)
    │           │           │
    └───────────┼───────────┘
                │
                ▼
          [Vercel CDN]
       (Edge locations worldwide)
                │
                ▼
          [Render Server]
        (Single region: US)
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
[MongoDB]   [Redis]    [Firebase]
(Multi-    (Global)    (Global)
 region)
```

**Note:** Free tier typically uses single region. Latency may vary by user location.

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────┐
│           Security Layers                   │
└─────────────────────────────────────────────┘

Layer 1: Frontend
━━━━━━━━━━━━━━━━
    │
    ├─► Firebase Auth (email/password)
    ├─► JWT stored in localStorage
    ├─► Protected routes (redirect if no token)
    └─► HTTPS/WSS in production


Layer 2: Backend API
━━━━━━━━━━━━━━━━━━
    │
    ├─► CORS validation (CLIENT_URL whitelist)
    ├─► JWT verification middleware
    ├─► Input validation
    └─► Error handling (no sensitive data leaked)


Layer 3: WebSocket
━━━━━━━━━━━━━━━━
    │
    ├─► JWT authentication on connection
    ├─► Token passed via query param
    ├─► Connection closed if invalid (code 4001)
    └─► Message validation (length, content)


Layer 4: Services
━━━━━━━━━━━━━━━
    │
    ├─► MongoDB: Username/password + IP whitelist
    ├─► Redis: Password protected
    ├─► Firebase: Service account (private key)
    └─► Environment variables (never committed)
```

---

## 📈 Scaling Considerations

```
Current (Free Tier):
━━━━━━━━━━━━━━━━━

    1 Render Instance
           │
    ┌──────┼──────┐
    │             │
  Redis        MongoDB
  (Pub/Sub)    (Storage)

Supports: ~100 concurrent users


Future Scaling Path:
━━━━━━━━━━━━━━━━━━

    Load Balancer
           │
    ┌──────┼──────┐
    │             │
Instance 1    Instance 2 ... Instance N
    │             │
    └──────┬──────┘
           │
    Redis (Pub/Sub)
           │
    ┌──────┼──────┐
    │             │
  MongoDB      Redis Cache
 (Primary)    (Message queue)

Supports: 10,000+ concurrent users
```

---

**These diagrams explain the complete system architecture! 📐**
