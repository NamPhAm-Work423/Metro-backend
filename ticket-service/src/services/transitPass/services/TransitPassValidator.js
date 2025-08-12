class TransitPassValidator {
  validateCreate(data) {
    const errors = [];
    if (!data.transitPassType) errors.push('transitPassType is required');
    if (!data.price && data.price !== 0) errors.push('price is required');
    if (data.price < 0) errors.push('price must be >= 0');
    if (data.currency && !['VND', 'USD', 'CNY'].includes(data.currency)) errors.push('invalid currency');
    if (errors.length) throw new Error(errors.join(', '));
  }

  validateUpdate(data) {
    const errors = [];
    if (data.price !== undefined && data.price < 0) errors.push('price must be >= 0');
    if (data.currency && !['VND', 'USD', 'CNY'].includes(data.currency)) errors.push('invalid currency');
    if (errors.length) throw new Error(errors.join(', '));
  }
}

module.exports = new TransitPassValidator();


