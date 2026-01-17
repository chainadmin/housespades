import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { migrate } from "./migrate";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Use PostgreSQL for session storage - sessions persist across container restarts
const PgSession = connectPgSimple(session);

// CORS configuration for mobile app and web
const allowedOrigins = [
  'https://housespades-production.up.railway.app',
  'https://www.housespades-production.up.railway.app',
  'https://housespades.com',
  'https://www.housespades.com',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:8081', // Expo dev
  'http://localhost:19006', // Expo web
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    // Native mobile apps don't send an Origin header
    if (!origin) {
      return callback(null, true);
    }
    // Allow all Railway subdomains
    if (origin.endsWith('.up.railway.app')) {
      return callback(null, true);
    }
    // Allow Replit development domains
    if (origin.endsWith('.replit.dev')) {
      return callback(null, true);
    }
    // Allow localhost in any environment for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    // Allow listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Log blocked origins for debugging
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "house-spades-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pool,
      tableName: 'session', // Table name for sessions
      // Table is created by migrate.ts - don't use createTableIfMissing as it fails in production builds
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" required for cross-origin mobile requests
    },
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run database migration on startup
  await migrate();
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
