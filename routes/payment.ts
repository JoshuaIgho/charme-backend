
// backend/routes/payment.ts
import type { Express, Request, Response } from 'express';

export const paymentRoutes = (app: Express) => {
  const axios = require('axios');
  
  console.log('🔧 Registering payment routes...');

  // ============================================
  // PAYSTACK ROUTES
  // ============================================
  
  // Paystack verify payment
  app.get('/api/payment/paystack/verify/:reference', async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      console.log('🔍 Verifying Paystack payment:', reference);
      
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      
      if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key not configured');
      }

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { data } = response.data;

      if (data.status === 'success') {
        console.log('✅ Payment verified successfully');
        res.json({
          success: true,
          data: {
            reference: data.reference,
            amount: data.amount / 100, // Convert from kobo to naira
            status: data.status,
            paidAt: data.paid_at,
            customer: {
              email: data.customer.email,
            },
            metadata: data.metadata,
          },
        });
      } else {
        console.log('⚠️ Payment verification failed');
        res.json({
          success: false,
          message: 'Payment verification failed',
        });
      }
    } catch (error: any) {
      console.error('❌ Paystack verification error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      });
    }
  });

  // Paystack initialize payment
  app.post('/api/payment/paystack/initialize', async (req: Request, res: Response) => {
    try {
      const { email, amount, metadata } = req.body;
      console.log('💳 Initializing Paystack payment');
      
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      
      if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key not configured');
      }

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amount * 100, // Convert to kobo
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Payment initialized successfully');
      res.json({
        success: true,
        data: response.data.data,
      });
    } catch (error: any) {
      console.error('❌ Paystack initialization error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Payment initialization failed',
        error: error.message,
      });
    }
  });

  // ============================================
  // STRIPE ROUTES
  // ============================================

  // Stripe create payment intent
  app.post('/api/payment/stripe/create-intent', async (req: Request, res: Response) => {
    try {
      console.log('💳 Creating Stripe payment intent...');
      const { amount, orderId, metadata } = req.body;
      
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
      
      if (!STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
      }

      const stripe = require('stripe')(STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'ngn',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          orderNumber: metadata?.orderNumber,
          userId: metadata?.userId,
        },
      });

      console.log('✅ Payment intent created:', paymentIntent.id);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('❌ Stripe error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message,
      });
    }
  });

  // Stripe confirm payment (for verification)
  app.get('/api/payment/stripe/confirm/:intentId', async (req: Request, res: Response) => {
    try {
      const { intentId } = req.params;
      console.log('🔍 Confirming Stripe payment');
      
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
      
      if (!STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
      }

      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

      res.json({
        success: paymentIntent.status === 'succeeded',
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          metadata: paymentIntent.metadata,
        },
      });
    } catch (error: any) {
      console.error('❌ Stripe confirmation error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message,
      });
    }
  });

  console.log('✅ Payment routes registered successfully');
  console.log('   - POST /api/payment/paystack/initialize');
  console.log('   - GET  /api/payment/paystack/verify/:reference');
  console.log('   - POST /api/payment/stripe/create-intent');
  console.log('   - GET  /api/payment/stripe/confirm/:intentId');
};
