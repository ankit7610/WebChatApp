# Real-Time Chat Application

A scalable, real-time messaging platform built with the MERN stack (MongoDB, Express, React, Node.js) and WebSocket, designed for zero-cost deployment.

## 🛠 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS | SPA with responsive UI and client-side routing. |
| **Backend** | Node.js, Express, `ws` | REST API and WebSocket server for real-time events. |
| **Database** | MongoDB Atlas (M0) | Persistent storage for users and message history. |
| **Pub/Sub** | Upstash Redis | Message broadcasting across scaled server instances. |
| **Auth** | Firebase Auth, JWT | Secure identity management and stateless session handling. |
| **DevOps** | Vercel, Render | CI/CD pipelines for frontend and backend hosting. |

## 🏗 Architecture

The system employs a **Pub/Sub architecture** to ensure scalability across multiple server instances.

1.  **Client**: Authenticates via Firebase; connects to WebSocket with JWT.
2.  **Server**: Validates JWT; persists messages to MongoDB; publishes events to Redis.
3.  **Redis**: Broadcasts messages to all subscribed server instances.
4.  **Delivery**: Server instances push messages to connected WebSocket clients.

**Key Features:**
*   **Real-time**: WebSocket-based bi-directional communication.
*   **Persistence**: Full message history stored in MongoDB.
*   **Scalability**: Redis Pub/Sub enables horizontal scaling of WebSocket servers.
*   **Security**: Firebase ID tokens exchanged for session-scoped JWTs.
*   **Status Tracking**: Message delivery (double grey tick) and read receipts (double blue tick).

## 🚀 Local Development

### Prerequisites
*   Node.js v18+
*   MongoDB Atlas URI
*   Upstash Redis URL
*   Firebase Project Config

### Setup

1.  **Clone & Install**
    ```bash
    git clone <repo-url>
    cd ChatApp
    npm install     # Root (concurrently)
    cd client && npm install
    cd ../server && npm install
    ```

2.  **Environment Variables**
    Create `.env` in `server/` and `client/`:

    **`server/.env`**
    ```env
    PORT=3000
    MONGODB_URI=mongodb+srv://...
    JWT_SECRET=your_jwt_secret
    REDIS_URL=rediss://default:...
    FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
    ```

    **`client/.env`**
    ```env
    VITE_API_URL=http://localhost:3000
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    ```

3.  **Run**
    ```bash
    # From root directory
    npm run dev
    ```

## 🧪 Testing

*   **Unit/Integration**: `npm test` (in `client/` or `server/`)
*   **E2E**: Playwright tests available in `client/tests/`.

## 📦 Deployment

*   **Frontend**: Auto-deploys to Vercel on push to `main`.
*   **Backend**: Auto-deploys to Render on push to `main`.
