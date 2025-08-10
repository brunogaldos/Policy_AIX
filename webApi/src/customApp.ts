import { PolicySynthApiApp } from '@policysynth/api/app.js';
import cors from 'cors';

export class CustomPolicySynthApiApp extends PolicySynthApiApp {
  constructor(controllers: any[], port?: number) {
    super(controllers, port);
    // Apply CORS immediately after parent constructor - this ensures it's applied first
    this.applyCorsToApp();
    
    // CRITICAL: Re-apply CORS after a short delay to ensure it overrides any parent middleware
    setTimeout(() => {
      console.log('🔄 Re-applying CORS middleware after parent initialization...');
      this.applyCorsToApp();
    }, 100);
  }

  private applyCorsToApp() {
    console.log('🔧 Setting up COMPREHENSIVE CORS middleware...');
    
    // Handle preflight OPTIONS requests first
    this.app.options('*', (req, res) => {
      console.log(`🚀 OPTIONS preflight request for: ${req.method} ${req.path}`);
      const origin = req.headers.origin || 'http://localhost:2990';
      
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,HEAD,PATCH');
      res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-HTTP-Method-Override');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      res.status(200).end();
    });
    
    // Apply CORS headers to EVERY response, no matter what
    this.app.use((req, res, next) => {
      const origin = req.headers.origin || 'http://localhost:2990';
      
      console.log(`🚀 CORS: ${req.method} ${req.path} from origin: ${origin}`);
      
      // Set CORS headers on EVERY response
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,HEAD,PATCH');
      res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-HTTP-Method-Override');
      res.header('Access-Control-Expose-Headers', 'Content-Length,X-Foo,X-Bar');
      
      console.log('✅ CORS headers set for:', req.path);
      
      // Handle OPTIONS requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      next();
    });
    
    // Also apply the cors middleware as backup with more permissive settings
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:2990',  // webApp dev server
          'http://localhost:3000',  // resource-watch
          'http://localhost:3001',
          'http://127.0.0.1:2990',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.log(`⚠️ CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-HTTP-Method-Override'
      ],
      preflightContinue: false,
      optionsSuccessStatus: 200
    };
    
    this.app.use(cors(corsOptions));
    
    console.log('✅ COMPREHENSIVE CORS middleware fully configured');
  }
}