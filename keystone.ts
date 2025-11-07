// // keystone.ts - FIXED VERSION
// import 'dotenv/config';
// import { config } from '@keystone-6/core';
// import { lists } from './schema';
// import { withAuth, session } from './auth';
// import { clerkClient } from '@clerk/clerk-sdk-node';
// import express from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import path from 'path';
// import FormData from 'form-data';
// import fetch from 'node-fetch';
// import { paymentRoutes } from './routes/payment';

// // Load environment variables
// const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID;
// const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY;

// if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
//   throw new Error('Missing B2 credentials in .env file');
// }

// // Configure multer
// const uploadDir = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const uniqueName = `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'));
//     }
//   },
// });

// const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4000/api/graphql';

// export default withAuth(
//   config({
//     db: {
//       provider: 'postgresql',
//       url: process.env.DATABASE_URL || 'file:./keystone.db',
//       enableLogging: true,
//       idField: { kind: 'uuid' },
//     },
//     lists,
//     session,
//     storage: {
//       my_images: {
//         kind: 's3',
//         type: 'image',
//         bucketName: 'charme',
//         region: 'us-east-005',
//         endpoint: 'https://s3.us-east-005.backblazeb2.com',
//         accessKeyId: B2_ACCESS_KEY_ID,
//         secretAccessKey: B2_SECRET_ACCESS_KEY,
//         forcePathStyle: true,
//         signed: { expiry: 3600 },
//       },
//     },
//     server: {
//       port: parseInt(process.env.PORT || '4000'),
//       cors: {
//         origin: [
//           'http://localhost:3000',
//           'http://localhost:5173',
//           'https://charmesiri.vercel.app',
//           'https://*.vercel.app',
//           'https://charme-backend.onrender.com',
//         ],
//         credentials: true,
//       },
//       extendExpressApp: (app, commonContext) => {
//         console.log('🚀 Registering custom Express routes...');
        
//         app.use(express.json());
//         app.use(express.urlencoded({ extended: true }));
        
//         // ✅ Register payment routes
//         paymentRoutes(app);
        
//         // ✅ TEST ROUTE - Remove this after testing
//         app.get('/api/test', (req, res) => {
//           res.json({ message: 'Express routes are working!' });
//         });
        
//         // ✅ Sync user route
//         app.post('/api/sync-user', async (req, res) => {
//           try {
//             const authHeader = req.headers.authorization;
//             if (!authHeader) {
//               return res.status(401).json({ error: 'Missing Authorization header' });
//             }

//             const token = authHeader.replace('Bearer ', '');
//             const sessionData = await clerkClient.sessions.verifySession(token, token);
//             const clerkUser = await clerkClient.users.getUser(sessionData.userId);

//             const context = await commonContext.withRequest(req, res);
//             const existing = await context.query.User.findOne({
//               where: { clerkId: clerkUser.id },
//               query: 'id clerkId',
//             });

//             if (!existing) {
//               await context.query.User.createOne({
//                 data: {
//                   clerkId: clerkUser.id,
//                   email: clerkUser.emailAddresses[0].emailAddress,
//                   name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
//                 },
//                 query: 'id',
//               });
//               console.log('✅ Synced new user to Keystone');
//             }

//             res.json({ success: true });
//           } catch (err) {
//             console.error('❌ Sync user error:', err);
//             res.status(500).json({ error: 'Failed to sync user' });
//           }
//         });

//        // ✅ FIXED: Get featured products
// app.get('/api/products/featured', async (req, res) => {
//   console.log('🔍 GET /api/products/featured - Request received');
  
//   try {
//     const context = await commonContext.withRequest(req, res);
//     const limit = parseInt(req.query.limit as string) || 8;
    
//     console.log(`Fetching ${limit} featured products...`);
    
//     const products = await context.query.Product.findMany({
//       where: { 
//         isFeatured: { equals: true },
//         isActive: { equals: true }
//       },
//       take: limit,
//       query: `
//         id
//         name
//         price
//         originalPrice
//         description
//         isNewStock
//         isOnSale
//         primaryImage {
//           id
//           url
//         }
//         images {
//           id
//           image {
//             id
//             url
//           }
//         }
//       `
//     });
    
//     console.log(`✅ Found ${products.length} featured products`);
    
//     res.json({
//       success: true,
//       data: { products }
//     });
//   } catch (error) {
//     console.error('❌ Featured products error:', error);
//     res.status(500).json({
//       success: false,
//       // error: error.message || 'Failed to fetch featured products'
//       error: Error || 'Failed to upload image',

//     });
//   }
// });

// // ✅ FIXED: Get new arrivals
// app.get('/api/products/new-arrivals', async (req, res) => {
//   console.log('🆕 GET /api/products/new-arrivals - Request received');
  
//   try {
//     const context = await commonContext.withRequest(req, res);
//     const limit = parseInt(req.query.limit as string) || 8;
    
//     console.log(`Fetching ${limit} new arrivals...`);
    
//     const products = await context.query.Product.findMany({
//       where: { 
//         isNewStock: { equals: true },
//         isActive: { equals: true }
//       },
//       take: limit,
//       orderBy: { createdAt: 'desc' },
//       query: `
//         id
//         name
//         price
//         originalPrice
//         description
//         isNewStock
//         isOnSale
//         primaryImage {
//           id
//           url
//         }
//         images {
//           id
//           image {
//             id
//             url
//           }
//         }
//       `
//     });
    
//     console.log(`✅ Found ${products.length} new arrivals`);
    
//     res.json({
//       success: true,
//       data: { products }
//     });
//   } catch (error) {
//     console.error('❌ New arrivals error:', error);
//     res.status(500).json({
//       success: false,
//       // error: error.message || 'Failed to fetch new arrivals'
//       error: Error || 'Failed to upload image',

//     });
//   }
// });



// // ✅ FIXED: Get all products
// app.get('/api/products', async (req, res) => {
//   console.log('📦 GET /api/products - Request received');
  
//   try {
//     const context = await commonContext.withRequest(req, res);
//     const limit = parseInt(req.query.limit as string) || 20;
//     const category = req.query.category as string;
//     const isNew = req.query.new === 'true';
    
//     const where: any = { isActive: { equals: true } };
//     if (category) where.categoryType = { equals: category };
//     if (isNew) where.isNewStock = { equals: true };
    
//     const products = await context.query.Product.findMany({
//       where,
//       take: limit,
//       orderBy: { createdAt: 'desc' },
//       query: `
//         id
//         name
//         price
//         originalPrice
//         description
//         categoryType
//         isNewStock
//         isOnSale
//         primaryImage {
//           id
//           url
//         }
//         images {
//           id
//           image {
//             id
//             url
//           }
//         }
//       `
//     });
    
//     console.log(`✅ Found ${products.length} products`);
    
//     res.json({
//       success: true,
//       data: { products }
//     });
//   } catch (error) {
//     console.error('❌ Products fetch error:', error);
//     res.status(500).json({
//       success: false,
//       // error: error.message || 'Failed to fetch products'
//       error: Error || 'Failed to upload image',

//     });
//   }
// });

// // ✅ Upload product image
// app.post('/api/products/:id/upload-image', upload.single('image'), async (req, res) => {
//   try {
//     const productId = req.params.id;
//     if (!req.file) {
//       return res.status(400).json({ success: false, error: 'No image file uploaded' });
//     }

//     const context = await commonContext.withRequest(req, res);

//     // Update product with uploaded image
//     const updated = await context.query.Product.updateOne({
//       where: { id: productId },
//       data: {
//         images: {
//           create: [
//             {
//               image: {
//                 upload: req.file.path,
//               },
//             },
//           ],
//         },
//       },
//       query: 'id name images { id image { url } }',
//     });

//     res.json({
//       success: true,
//       message: 'Image uploaded successfully',
//       product: updated,
//     });
//   } catch (error) {
//     console.error('❌ Image upload error:', error);
//     res.status(500).json({
//       success: false,
//       error: Error || 'Failed to upload image',
//       // error: error.message || 'Failed to upload image',

//     });
//   }
// });

        
//         console.log('✅ Custom Express routes registered successfully');
//       },
//     },
    
//     graphql: {
//       playground: true,
//       cors: {
//         origin: [
//           "https://charmesiri.vercel.app",
//           "http://localhost:3000",
//           "https://charme-backend.onrender.com",
//         ],
//         credentials: true,
//       },
//       apolloConfig: { introspection: true },
//     },
//   })
// );



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
        signed: { expiry: 86400 },
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




// In keystone.ts - Fix the upload-image endpoint

app.post('/api/products/:id/upload-image', upload.single('image'), async (req, res) => {
  console.log('📝 Upload route hit');
  
  try {
    const productId = req.params.id;
    console.log('Product ID:', productId);

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    const context = await commonContext.withRequest(req, res);

    // Step 1: Upload to B2
    const { filesize, width, height, id, extension } = await context.images('my_images').getDataFromStream(
      fs.createReadStream(req.file.path),
      req.file.originalname
    );

    console.log('✅ Image uploaded to B2:', { id, filesize, width, height, extension });

    // Step 2: Create ProductImage record
    const productImage = await context.prisma.productImage.create({
      data: {
        product: { connect: { id: productId } },
        altText: req.file.originalname,
        image_filesize: filesize,
        image_extension: extension,
        image_width: width,
        image_height: height,
        image_id: id,
      },
    });

    console.log('✅ ProductImage created:', productImage);

    // Step 3: Construct the proper B2 URL
    const imageUrl = `https://s3.us-east-005.backblazeb2.com/charme/${id}.${extension}`;
    console.log('🖼️ Image URL:', imageUrl);

    // Step 4: Fetch updated product with properly formatted image URLs
    const updatedProduct = await context.query.Product.findOne({
      where: { id: productId },
      query: `
        id 
        name 
        images { 
          id 
          altText
          image { 
            id
            url
            width
            height
          } 
        }
      `,
    });

    console.log('✅ Product fetched with images');

    // Clean up local file
    fs.unlinkSync(req.file.path);
    console.log('✅ Local file cleaned up');

    res.json({ 
      success: true, 
      message: 'Image uploaded successfully',
      product: updatedProduct,
      uploadedImage: {
        id: productImage.id,
        url: imageUrl, // ✅ Return the constructed URL
        altText: req.file.originalname,
        width,
        height,
      }
    });

  } catch (err) {
    console.error('❌ Upload error:', err);
    console.error('Error stack:', (err as Error).stack);
    
    if (req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('🧹 Cleaned up local file after error');
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup file:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: (err as Error).message || 'Upload failed',
    });
  }
});




        
        console.log('✅ Custom Express routes registered successfully');
      },
    },
     graphql: {
      playground: true,
      cors: {
        origin: [
          "https://charmesiri.vercel.app",
          "http://localhost:3000",
          "https://charme-backend.onrender.com",
        ],
        credentials: true,
      },
      apolloConfig: { introspection: true },
    },
  })
);
