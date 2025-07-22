const { Service, ServiceInstance } = require('../models/index.model');

class ServiceService {
    findServiceById = async (id) => {
        const service = Service.findOne({
            where: {
                id: id
            }
        });
        return service;
    }

    findServiceByName = async (name) => {
        const service = Service.findOne({
            where: {
                name: name
            }
        });
        return service;
    }

    findServiceByEndPoint = async (endPoint) => {
        const service = Service.findOne({
            where: {
                endPoint: endPoint
            }
        });
        return service;
    }
    findServiceInstanceEndPoint = async (endPoint) => {
        const serviceInstance = ServiceInstance.findOne({
            where: {
                status: 'active',
            },
            include: [{
                model: Service,
                as: 'service',
                where: {
                    endPoint: endPoint
                }
            }]
        });
        return serviceInstance;
    }
    findInstancesByServiceId = async (serviceId) => {
        const instances = await ServiceInstance.findAll({
            where: {
                serviceId: serviceId,
            },
        });
        return instances;
    };
    createService = async (name, endPoint) => {
        const newService = await Service.create({
            name: name,
            endPoint: endPoint, 
        });
    
        return newService;
    };
    createBulkInstances = async (instances) => {
        await ServiceInstance.bulkCreate(instances);
    };

    deleteService = async (name) => {
        const service = await Service.findOne({
            where: {
                name: name,
            },
        });
        await ServiceInstance.destroy({
            where: {
                serviceId: service.id,
            },
        });
        await Service.destroy({
            where: {
                name: name,
            },
        });
        await deleteServiceFromRedis(service.endPoint);
    };
    createNewService = async (name, endPoint, instances) => {
        const t = await sequelize.transaction();
        const newService = await Service.create(
            {
                name: name,
                endPoint: endPoint,
            },
            { transaction: t },
        );
        instances.forEach((instance, index) => {
            instance['status'] = true;
            instance['serviceId'] = newService.id;
            instance['id'] = `${name}${index}`;
        });
        await ServiceInstance.bulkCreate(instances, { transaction: t });
        await t.commit();
    };
    createNewInstance = async (id, host, port) => {
        const instances = await ServiceInstance.findAll({
            where: {
                serviceId: id,
            },
        });
        const service = await Service.findOne({
            attributes: ['name'],
            where: {
                id: id,
            },
        });
        await ServiceInstance.create({
            id: `${service.name}${instances.length}`,
            host: host,
            port: port,
            serviceId: id,
        });
    };
    deleteInstance = async (id) => {    
        const instance = await ServiceInstance.findOne({
            where: {
                id: id,
            },
        });
        const service = await Service.findOne({
            where: {
                id: instance.serviceId,
            },
        });
        await ServiceInstance.destroy({
            where: {
                id: id,
            },
        });
        await deleteInstanceFromRedis(service.endPoint, instance.id);   
    };
    getAllService = async () => {
        const result = await Service.findAll({
            attributes: ['id', 'name', 'endPoint'],
                include: [
                    {
                        model: ServiceInstance,
                        attributes: ['id', 'host', 'port'],
                    },
                ],
            });
        return result;
    };
    getServiceByName = async (name) => {
        const result = await Service.findOne({
            attributes: ['id', 'name', 'endPoint'],
            where: {
                name: name,
                },
                include: [
                    {
                        model: ServiceInstance,
                        attributes: ['host', 'port'],
                    },
                ],
            });
        return result;
    };
}   

module.exports = new ServiceService();

