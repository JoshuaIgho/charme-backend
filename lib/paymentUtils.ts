// lib/paymentUtils.ts
import fetch from 'node-fetch';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export const paystackUtils = {
  verifyPayment: async (reference: string) => {
    console.log('\n========================================');
    console.log('🔍 PAYSTACK VERIFICATION START');
    console.log('========================================');
    console.log('📋 Reference:', reference);
    console.log('🔑 Secret Key:', PAYSTACK_SECRET_KEY ? `${PAYSTACK_SECRET_KEY.substring(0, 10)}...` : '❌ MISSING!');
    
    try {
      const url = `https://api.paystack.co/transaction/verify/${reference}`;
      console.log('🌐 Request URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      console.log('📊 Response Status:', response.status);
      console.log('📊 Response OK:', response.ok);
      
      const data = await response.json();
      console.log('📦 Response Data:', JSON.stringify(data, null, 2));
      
      if (data.status && data.data.status === 'success') {
        console.log('✅ Payment verified successfully');
        console.log('💰 Amount:', data.data.amount);
        console.log('📧 Customer:', data.data.customer.email);
        console.log('========================================\n');
        return {
          success: true,
          data: data.data,
          message: 'Payment verified successfully',
        };
      } else {
        console.log('❌ Payment verification failed');
        console.log('❌ Reason:', data.message || 'Unknown');
        console.log('❌ Payment Status:', data.data?.status || 'Unknown');
        console.log('========================================\n');
        return {
          success: false,
          message: data.message || 'Payment verification failed',
          details: data,
        };
      }
    } catch (error: any) {
      console.error('💥 PAYSTACK VERIFICATION ERROR');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.log('========================================\n');
      throw new Error(error.message || 'Payment verification failed');
    }
  },

  initializePayment: async ({ email, amount, metadata }: any) => {
    console.log('\n========================================');
    console.log('🚀 PAYSTACK INITIALIZATION START');
    console.log('========================================');
    console.log('📧 Email:', email);
    console.log('💰 Amount:', amount);
    console.log('📋 Metadata:', JSON.stringify(metadata, null, 2));
    console.log('🔑 Secret Key:', PAYSTACK_SECRET_KEY  ? `${PAYSTACK_SECRET_KEY.substring(0, 10)}...` : '❌ MISSING!');
    
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount, // Amount in kobo (already multiplied by 100 from frontend)
          metadata,
        }),
      });

      console.log('📊 Response Status:', response.status);
      console.log('📊 Response OK:', response.ok);
      
      const data = await response.json();
      console.log('📦 Response Data:', JSON.stringify(data, null, 2));

      if (data.status) {
        console.log('✅ Payment initialized successfully');
        console.log('🔗 Authorization URL:', data.data.authorization_url);
        console.log('🎫 Reference:', data.data.reference);
        console.log('========================================\n');
        return {
          success: true,
          data: data.data,
          authorization_url: data.data.authorization_url,
          access_code: data.data.access_code,
          reference: data.data.reference,
        };
      } else {
        console.log('❌ Payment initialization failed');
        console.log('❌ Reason:', data.message || 'Unknown');
        console.log('========================================\n');
        return {
          success: false,
          message: data.message || 'Payment initialization failed',
          details: data,
        };
      }
    } catch (error: any) {
      console.error('💥 PAYSTACK INITIALIZATION ERROR');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.log('========================================\n');
      throw new Error(error.message || 'Payment initialization failed');
    }
  },
};

export const stripeUtils = {
  createPaymentIntent: async ({ amount, metadata }: any) => {
    console.log('\n========================================');
    console.log('🚀 STRIPE CREATE PAYMENT INTENT');
    console.log('========================================');
    console.log('💰 Amount:', amount);
    console.log('📋 Metadata:', JSON.stringify(metadata, null, 2));
    console.log('🔑 Secret Key:', STRIPE_SECRET_KEY ? `${STRIPE_SECRET_KEY.substring(0, 10)}...` : '❌ MISSING!');
    
    try {
      const stripe = require('stripe')(STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'ngn',
        metadata,
      });

      console.log('✅ Payment intent created');
      console.log('🎫 Payment Intent ID:', paymentIntent.id);
      console.log('📊 Status:', paymentIntent.status);
      console.log('========================================\n');
      
      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('💥 STRIPE CREATE INTENT ERROR');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.log('========================================\n');
      throw new Error(error.message || 'Failed to create payment intent');
    }
  },

  confirmPayment: async (intentId: string) => {
    console.log('\n========================================');
    console.log('🔍 STRIPE CONFIRM PAYMENT');
    console.log('========================================');
    console.log('🎫 Intent ID:', intentId);
    
    try {
      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

      console.log('📊 Payment Status:', paymentIntent.status);
      console.log('💰 Amount:', paymentIntent.amount);

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment confirmed successfully');
        console.log('========================================\n');
        return {
          success: true,
          data: paymentIntent,
          message: 'Payment confirmed successfully',
        };
      } else {
        console.log('❌ Payment not completed');
        console.log('❌ Status:', paymentIntent.status);
        console.log('========================================\n');
        return {
          success: false,
          message: 'Payment not completed',
          status: paymentIntent.status,
        };
      }
    } catch (error: any) {
      console.error('💥 STRIPE CONFIRM ERROR');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.log('========================================\n');
      throw new Error(error.message || 'Failed to confirm payment');
    }
  },
};