import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24-preview' as any,
});

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
} else {
  console.warn('firebase-applet-config.json not found. Firestore updates will fail.');
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook - MUST be before express.json()
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        try {
          await db.collection('users').doc(userId).update({
            subscription: 'pro',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`User ${userId} upgraded to Pro via webhook.`);
        } catch (error) {
          console.error(`Error updating user ${userId}:`, error);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Create Checkout Session
  app.post('/api/create-checkout-session', async (req, res) => {
    const { userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Axion Pro Subscription',
                description: 'Unlimited messages and advanced AI features',
              },
              unit_amount: 1900, // $19.00
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=success`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancel`,
        client_reference_id: userId,
        customer_email: userEmail,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simulated Payment Success (for users without Stripe)
  app.post('/api/simulate-payment-success', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      await db.collection('users').doc(userId).update({
        subscription: 'pro',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`User ${userId} upgraded to Pro via simulated payment.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error updating user ${userId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
