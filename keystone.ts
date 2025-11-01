// keystone.ts - FIXED VERSION
import 'dotenv/config';
import { config } from '@keystone-6/core';
import { lists } from './schema';
import { withAuth, session } from './auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { paymentRoutes } from './routes/payment';

// Load environment variables
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID;
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY;

if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
  throw new Error('Missing B2 credentials in .env file');
}

// Configure multer
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4000/api/graphql';

export default withAuth(
  config({
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL || 'file:./keystone.db',
      enableLogging: true,
      idField: { kind: 'uuid' },
    },
    lists,
    session,
    storage: {
      my_images: {
        kind: 's3',
        type: 'image',
        bucketName: 'charme',
        region: 'us-east-005',
        endpoint: 'https://s3.us-east-005.backblazeb2.com',
        accessKeyId: B2_ACCESS_KEY_ID,
        secretAccessKey: B2_SECRET_ACCESS_KEY,
        forcePathStyle: true,
        signed: { expiry: 3600 },
      },
    },
    server: {
      port: parseInt(process.env.PORT || '4000'),
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://charmesiri.vercel.app',
          'https://*.vercel.app',
          'https://charme-backend.onrender.com',
        ],
        credentials: true,
      },
      extendExpressApp: (app, commonContext) => {
        console.log('🚀 Registering custom Express routes...');
        
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        
        // ✅ Register payment routes
        paymentRoutes(app);
        
        // ✅ TEST ROUTE - Remove this after testing
        app.get('/api/test', (req, res) => {
          res.json({ message: 'Express routes are working!' });
        });
        
        // ✅ Sync user route
        app.post('/api/sync-user', async (req, res) => {
          try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
              return res.status(401).json({ error: 'Missing Authorization header' });
            }

            const token = authHeader.replace('Bearer ', '');
            const sessionData = await clerkClient.sessions.verifySession(token, token);
            const clerkUser = await clerkClient.users.getUser(sessionData.userId);

            const context = await commonContext.withRequest(req, res);
            const existing = await context.query.User.findOne({
              where: { clerkId: clerkUser.id },
              query: 'id clerkId',
            });

            if (!existing) {
              await context.query.User.createOne({
                data: {
                  clerkId: clerkUser.id,
                  email: clerkUser.emailAddresses[0].emailAddress,
                  name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                },
                query: 'id',
              });
              console.log('✅ Synced new user to Keystone');
            }

            res.json({ success: true });
          } catch (err) {
            console.error('❌ Sync user error:', err);
            res.status(500).json({ error: 'Failed to sync user' });
          }
        });

       // ✅ FIXED: Get featured products
app.get('/api/products/featured', async (req, res) => {
  console.log('🔍 GET /api/products/featured - Request received');
  
  try {
    const context = await commonContext.withRequest(req, res);
    const limit = parseInt(req.query.limit as string) || 8;
    
    console.log(`Fetching ${limit} featured products...`);
    
    const products = await context.query.Product.findMany({
      where: { 
        isFeatured: { equals: true },
        isActive: { equals: true }
      },
      take: limit,
      query: `
        id
        name
        price
        originalPrice
        description
        isNewStock
        isOnSale
        primaryImage {
          id
          url
        }
        images {
          id
          image {
            id
            url
          }
        }
      `
    });
    
    console.log(`✅ Found ${products.length} featured products`);
    
    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('❌ Featured products error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch featured products'
    });
  }
});

// ✅ FIXED: Get new arrivals
app.get('/api/products/new-arrivals', async (req, res) => {
  console.log('🆕 GET /api/products/new-arrivals - Request received');
  
  try {
    const context = await commonContext.withRequest(req, res);
    const limit = parseInt(req.query.limit as string) || 8;
    
    console.log(`Fetching ${limit} new arrivals...`);
    
    const products = await context.query.Product.findMany({
      where: { 
        isNewStock: { equals: true },
        isActive: { equals: true }
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      query: `
        id
        name
        price
        originalPrice
        description
        isNewStock
        isOnSale
        primaryImage {
          id
          url
        }
        images {
          id
          image {
            id
            url
          }
        }
      `
    });
    
    console.log(`✅ Found ${products.length} new arrivals`);
    
    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('❌ New arrivals error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch new arrivals'
    });
  }
});

// ✅ FIXED: Get all products
app.get('/api/products', async (req, res) => {
  console.log('📦 GET /api/products - Request received');
  
  try {
    const context = await commonContext.withRequest(req, res);
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const isNew = req.query.new === 'true';
    
    const where: any = { isActive: { equals: true } };
    if (category) where.categoryType = { equals: category };
    if (isNew) where.isNewStock = { equals: true };
    
    const products = await context.query.Product.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      query: `
        id
        name
        price
        originalPrice
        description
        categoryType
        isNewStock
        isOnSale
        primaryImage {
          id
          url
        }
        images {
          id
          image {
            id
            url
          }
        }
      `
    });
    
    console.log(`✅ Found ${products.length} products`);
    
    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('❌ Products fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products'
    });
  }
});
        
        console.log('✅ Custom Express routes registered successfully');
      },
    },
    graphql: {
      path: '/api/graphql',
      playground: process.env.NODE_ENV !== 'production',
      apolloConfig: {
        csrfPrevention: false,
      },
    },
  })
);