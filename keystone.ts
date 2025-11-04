// keystone.ts
import 'dotenv/config'; // ✅ Load environment variables FIRST!

import { config } from '@keystone-6/core';
import { lists } from './schema';
import { withAuth, session } from './auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import express from 'express'; // ✅ ADD THIS!
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { paymentRoutes } from './routes/payment';

// Load environment variables
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID ;
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY ;

// Validate credentials
if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
  throw new Error('Missing B2 credentials in .env file');
}

// Configure multer to save files temporarily
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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
     port: 4000,
    cors: {
      origin: [
        'http://localhost:3000',
        'https://charmesiri.vercel.app',
        'https://*.vercel.app',
      ],
      credentials: true,
    },

      extendExpressApp: (app, commonContext) => {
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        
        // ✅ REGISTER PAYMENT ROUTES
        paymentRoutes(app);
        
        // ✅ Sync Clerk user with Keystone
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
              console.log('✅ Synced new user to Keystone:', clerkUser.emailAddresses[0].emailAddress);
            } else {
              console.log('ℹ️ User already exists in Keystone');
            }

            res.json({ success: true });
          } catch (err) {
            console.error('❌ Sync user error:', err);
            res.status(500).json({ error: 'Failed to sync user' });
          }
        });

        // ✅ Upload product image endpoint - Using GraphQL multipart request
        app.post('/api/products/:productId/upload-image', upload.single('image'), async (req, res) => {
          console.log('========================================');
          console.log('🚀 BACKEND: Image upload request received');
          console.log('========================================');
          
          let tempFilePath = null;
          
          try {
            const { productId } = req.params;
            const file = req.file;

            console.log('📋 Product ID:', productId);
            console.log('📁 File received:', file ? {
              fieldname: file.fieldname,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path
            } : 'No file');

            if (!file) {
              console.error('❌ No file uploaded');
              return res.status(400).json({ 
                success: false,
                error: 'No image file provided' 
              });
            }

            if (!productId) {
              console.error('❌ No product ID provided');
              return res.status(400).json({ 
                success: false,
                error: 'Product ID is required' 
              });
            }

            tempFilePath = file.path;

            console.log('💾 Uploading image through Keystone GraphQL API...');

            // Create a multipart form for GraphQL upload
            const form = new FormData();
            
            // Add the GraphQL operations
            const operations = {
              query: `
                mutation UpdateProductImage($id: ID!, $image: Upload!) {
                  updateProduct(where: { id: $id }, data: { image: { upload: $image } }) {
                    id
                    name
                    image {
                      id
                      url
                    }
                  }
                }
              `,
              variables: {
                id: productId,
                image: null
              }
            };
            
            form.append('operations', JSON.stringify(operations));
            
            // Add the map to tell GraphQL where the file is
            const map = {
              '0': ['variables.image']
            };
            form.append('map', JSON.stringify(map));
            
            // Add the actual file
            form.append('0', fs.createReadStream(file.path), {
              filename: file.originalname,
              contentType: file.mimetype,
            });

            // Send the multipart request to Keystone's GraphQL endpoint
            const headers = form.getHeaders();
            headers['apollo-require-preflight'] = 'true'; // Add CSRF protection header
            
            const graphqlResponse = await fetch('http://localhost:4000/api/graphql', {
              method: 'POST',
              body: form,
              headers: headers,
            });

            const result = await graphqlResponse.json();
            
            if (result.errors) {
              console.error('GraphQL errors:', result.errors);
              throw new Error(result.errors[0].message);
            }

            const updatedProduct = result.data?.updateProduct;
            
            if (!updatedProduct) {
              throw new Error('Failed to update product');
            }

            console.log('✅ Product updated successfully');
            console.log('📷 Image URL:', updatedProduct.image?.url);
            console.log('========================================\n');

            // Clean up temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log('🧹 Cleaned up temporary file');
            }

            res.json({
              success: true,
              message: 'Image uploaded successfully',
              data: {
                productId: updatedProduct.id,
                imageUrl: updatedProduct.image?.url,
              },
            });
          } catch (error) {
            console.error('❌ Upload error:', error);
            console.error('Error details:', {
            
            });
            console.log('========================================\n');
            
            // Clean up temp file on error
            if (tempFilePath && fs.existsSync(tempFilePath)) {
              try {
                fs.unlinkSync(tempFilePath);
                console.log('🧹 Cleaned up temporary file after error');
              } catch (cleanupError) {
                console.error('Failed to clean up temp file:', cleanupError);
              }
            }
            
            res.status(500).json({
              success: false,
              error: 'Failed to upload image',
             
            });
          }
        });
      },
    },
  })
);