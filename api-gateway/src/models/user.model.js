const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accountLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailToken: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  emailTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  roles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['user'],
    validate: {
      isArrayOfStrings(value) {
        if (!Array.isArray(value)) {
          throw new Error('Roles must be an array');
        }
        if (!value.every(role => typeof role === 'string')) {
          throw new Error('All roles must be strings');
        }
      }
    }
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['emailToken']
    },
    {
      fields: ['passwordResetToken']
    }
  ]
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.generateEmailToken = function() {
  this.emailToken = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.emailToken;
};

User.prototype.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  this.passwordResetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return this.passwordResetToken;
};

User.prototype.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

User.prototype.incLoginAttempts = async function() {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  // If we have previous lock and it's expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockUntil: null
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we hit max attempts and are not locked yet, lock account
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.lockUntil = new Date(Date.now() + lockTime);
  }

  return this.update({
    loginAttempts: this.loginAttempts + 1,
    ...(updates.lockUntil && { lockUntil: updates.lockUntil })
  });
};

User.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockUntil: null
  });
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  // Remove sensitive fields
  delete values.password;
  delete values.emailToken;
  delete values.passwordResetToken;
  delete values.loginAttempts;
  delete values.lockUntil;
  return values;
};

// Static methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

User.findByEmailToken = function(token) {
  return this.findOne({ 
    where: { 
      emailToken: token,
      emailTokenExpiry: {
        [require('sequelize').Op.gt]: new Date()
      }
    } 
  });
};

User.findByPasswordResetToken = function(token) {
  return this.findOne({ 
    where: { 
      passwordResetToken: token,
      passwordResetExpiry: {
        [require('sequelize').Op.gt]: new Date()
      }
    } 
  });
};

module.exports = User; 