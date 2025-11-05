// keystone.ts

import "dotenv/config";

import { config } from "@keystone-6/core";
import { lists } from "./schema";
import { withAuth, session } from "./auth";

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";
import { paymentRoutes } from "./routes/payment";

// Load B2 environment variables
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID;
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY;

// Validate credentials
if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
  throw new Error("Missing B2 credentials in .env file");
}

// Multer Upload Folder
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${require("crypto")
      .randomBytes(8)
      .toString("hex")}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"));
  },
});

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: process.env.DATABASE_URL || "file:./keystone.db",
      enableLogging: true,
      idField: { kind: "uuid" },
    },

    lists,
    session,

    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName: "charme",
        region: "us-east-005",
        endpoint: "https://s3.us-east-005.backblazeb2.com",
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
          "https://charmesiri.vercel.app",
          "http://localhost:3000",
          "https://charme-backend.onrender.com",
        ],
        credentials: true,
      },

      // ✅ REST API ROUTES HERE
      extendExpressApp: (app, commonContext) => {
        // ✅ Featured products route
        app.get("/api/products/featured", async (req, res) => {
          const limit = Number(req.query.limit) || 8;
          try {
            const products = await commonContext.db.Product.findMany({
              where: {
                isActive: { equals: true },
                isFeatured: { equals: true },
              },
              take: limit,
              orderBy: { createdAt: "desc" },
            });

            return res.json({ success: true, data: { products } });
          } catch (error) {
            return res.status(500).json({ success: false, error: Error });
          }
        });

        // ✅ New arrivals route
        app.get("/api/products/new-arrivals", async (req, res) => {
          const limit = Number(req.query.limit) || 8;
          try {
            const products = await commonContext.db.Product.findMany({
              where: {
                isActive: { equals: true },
                isNewStock: { equals: true },
              },
              take: limit,
              orderBy: { createdAt: "desc" },
            });

            return res.json({ success: true, data: { products } });
          } catch (error) {
            return res.status(500).json({ success: false, error: Error });
          }
        });

        // ✅ All products route
        app.get("/api/products", async (req, res) => {
          const limit = Number(req.query.limit) || 20;
          const category = req.query.category;
          const isNew = req.query.new === "true";

          try {
            const where: any = { isActive: { equals: true } };

            if (category) where.category = { equals: category };
            if (isNew) where.isNewStock = { equals: true };

            const products = await commonContext.db.Product.findMany({
              where,
              take: limit,
              orderBy: { createdAt: "desc" },
            });

            return res.json({ success: true, data: { products } });
          } catch (error) {
            return res.status(500).json({ success: false, error: Error });
          }
        });
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
