const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransitPass = sequelize.define('TransitPass', {
    transitPassId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    transitPassType: {
        type: DataTypes.ENUM('day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'),
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'VND',
        type: DataTypes.ENUM('VND', 'USD', 'CNY'),
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
}, {
    tableName: 'TransitPasses',
    timestamps: true,
    indexes: [
        {
            fields: ['transitPassType']
        }
    ]
});

module.exports = TransitPass;