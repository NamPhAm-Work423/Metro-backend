const fs = require('fs');

function Config() {
    var config = JSON.parse(fs.readFileSync(__dirname  + '/config.json'), 'utf8');
    return {
        gateway: {
            port: config.gateway.port,
            secure: config.gateway.secure
        },
        services: config.services,
        serviceRegistry: config.serviceRegistry
    };
}

module.exports=Config;