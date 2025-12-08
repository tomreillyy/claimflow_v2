import Stripe from 'stripe';

// Only initialize Stripe if the secret key is available
// This allows the app to build without the key being set
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;
