const paypal = require('@paypal/checkout-server-sdk');

// Configure environment based on NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction 
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_SECRET
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_SECRET
    );

const client = new paypal.core.PayPalHttpClient(environment);

module.exports = {
  client,
  paypal
};
