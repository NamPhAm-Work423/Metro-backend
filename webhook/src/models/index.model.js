const { mongoose } = require('../config/database');

// Import specialized models
const PayPalHook = require('./paypal.hook.model');


module.exports = {
    PayPalHook,
    mongoose
}; 