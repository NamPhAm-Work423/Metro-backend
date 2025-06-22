const config = require('./config')();
const serviceController = require('./controllers/service.controller');
const { storeInstances } = require('./services/loadBalancer.service');
const { initializeRedis } = require('./config/redis');
const { ServiceInstance } = require('./models/index.model');

const initialize = async () => {
    console.log('Inittialzing gateway...');
    await initializeRedis();
    let services = config.services;
    if (services) {
        for (const service of services) {
            let name = service['name'];
            let endPoint = service['endPoint'];
            let foundService = await serviceController.findServiceByEndPoint(endPoint);
            if (foundService) {
                let instances = service['instances'];
                if (instances) {
                    instances = service['instances'];
                    instances.forEach((instance) => {
                        instance['status'] = 'active';
                    });
                    instances.forEach((instance) => {
                        instance['serviceId'] = foundService.id;
                    });
                    for (const i of instances) {
                        console.log('Async instances...');
                        const exist = await ServiceInstance.findOne({
                            where: {
                                serviceId: foundService.id,
                                host: i['host'],
                                port: i['port']
                            },
                        });
                        if (!exist) {
                            await ServiceInstance.create(i);
                        }
                    }
                }
                instances = service['instances'];
                instances.forEach((instance) => {
                    instance['status'] = 'active';
                });
                await storeInstances(endPoint, instances);
            } else {
                let instances = service['instances'];
                instances.forEach((instance) => {
                    instance['status'] = 'active';
                });
                await storeInstances(endPoint, instances);
                let newService = await serviceController.create(name, endPoint);
                instances.forEach((instance) => {
                    instance['serviceId'] = newService.id;
                });
                await serviceController.createBulkInstances(instances);
            }
        }
    }
};

module.exports = initialize;
