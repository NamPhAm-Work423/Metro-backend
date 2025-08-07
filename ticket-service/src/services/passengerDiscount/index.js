const IPassengerDiscountService = require('./interfaces/IPassengerDiscountService');
const PassengerDiscountRepository = require('./repositories/PassengerDiscountRepository');
const PassengerDiscountService = require('./services/PassengerDiscountService');

module.exports = {
    IPassengerDiscountService,
    PassengerDiscountRepository,
    PassengerDiscountService
};
