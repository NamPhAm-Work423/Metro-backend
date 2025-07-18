const SupportReq = require('./supportReq.model');
const Guide = require('./guide.model');
const Chat = require('./chat.model');
const sequelize = require('../config/database');


module.exports = {
    SupportReq,
    Guide,
    Chat,
    sequelize
};
