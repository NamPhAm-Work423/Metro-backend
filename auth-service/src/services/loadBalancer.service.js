const { getClient, withRedisClient } = require('../config/redis');
const axios = require('axios');
const routeCache = require('./routeCache.service');

/**
 * Store instances in Redis following clean tree structure
 * @param {string} endPoint - The endpoint to store instances for
 * @param {Array} instances - The instances to store
 * @returns {Promise<Array>} - The result of the multi operation
 */
async function storeInstances(endPoint, instances) {
    return withRedisClient(async (client) => {
        const multi = client.multi();
        for (const instance of instances) {
            // Follow clean tree: loadbalancer:instances:service:{serviceName}:{instanceId}
            const instanceId = instance.id || `${instance.host}:${instance.port}`;
            const instanceKey = `loadbalancer:instances:service:${endPoint}:${instanceId}`;

            multi.hSet(instanceKey, {
                'host': instance.host,
                'port': instance.port.toString(),
                'status': instance.status ? 'true' : 'false',
                'endpoint': instance.endpoint || endPoint
            });

            // Track connections in sorted set: loadbalancer:connections:service:{serviceName}
            multi.zAdd(`loadbalancer:connections:service:${endPoint}`, {
                score: 0,
                value: instanceKey,
            });
        }

        return await multi.exec();
    });
}

/**
 * Get the least connections instance using clean tree structure
 * @param {string} endPoint - The endpoint to get the least connections instance for
 * @returns {Promise<Object>} - The least connections instance
 */
async function getLeastConnectionsInstance(endPoint) {
    return withRedisClient(async (client) => {
        const connectionsKey = `loadbalancer:connections:service:${endPoint}`;

        // Fetch all instances sorted by least connections
        const instanceKeys = await client.zRange(connectionsKey, 0, -1);

        if (!instanceKeys || instanceKeys.length === 0) {
            return null; // No instances available
        }

        for (const instanceKey of instanceKeys) {
            // Retrieve instance details from Redis
            const instanceDetails = await client.hGetAll(instanceKey);

            // Check if the instance is active
            if (instanceDetails.status === 'true') {
                return {
                    id: instanceKey.split(':').pop(), // Extract instance ID from the key
                    host: instanceDetails.host,
                    port: parseInt(instanceDetails.port),
                    endpoint: instanceDetails.endpoint,
                };
            }
        }

        return null;
    });
}

/**
 * Increment the connection count for an instance
 * @param {string} endPoint - The endpoint to increment the connection count for
 * @param {string} instanceId - The instance ID to increment the connection count for
 */
async function incrementConnection(endPoint, instanceId) {
    return withRedisClient(async (client) => {
        const connectionsKey = `loadbalancer:connections:service:${endPoint}`;
        const instanceKey = `loadbalancer:instances:service:${endPoint}:${instanceId}`;
        await client.zIncrBy(connectionsKey, 1, instanceKey);
    });
}

/**
 * Decrement the connection count for an instance
 * @param {string} endPoint - The endpoint to decrement the connection count for
 * @param {string} instanceId - The instance ID to decrement the connection count for
 */
async function decrementConnection(endPoint, instanceId) {
    return withRedisClient(async (client) => {
        const connectionsKey = `loadbalancer:connections:service:${endPoint}`;
        const instanceKey = `loadbalancer:instances:service:${endPoint}:${instanceId}`;
        await client.zIncrBy(connectionsKey, -1, instanceKey);
    });
}

/**
 * Delete a service from Redis using clean tree structure
 * @param {string} endPoint - The endpoint to delete the service for
 */
async function deleteServiceFromRedis(endPoint) {
    return withRedisClient(async (client) => {
        const multi = client.multi();

        // Remove the sorted set for the given endpoint
        const connectionsKey = `loadbalancer:connections:service:${endPoint}`;
        
        // Get all instance keys before deleting
        const instanceKeys = await client.zRange(connectionsKey, 0, -1);
        
        // Delete connections tracking
        multi.del(connectionsKey);

        if (instanceKeys.length > 0) {
            // Delete each instance hash
            instanceKeys.forEach((instanceKey) => {
                multi.del(instanceKey);
            });
        }

        return await multi.exec();
    });
}

/**
 * Delete an instance from Redis using clean tree structure
 * @param {string} endPoint - The endpoint to delete the instance for
 * @param {string} instanceId - The instance ID to delete
 */
async function deleteInstanceFromRedis(endPoint, instanceId) {
    return withRedisClient(async (client) => {
        const multi = client.multi();

        const instanceKey = `loadbalancer:instances:service:${endPoint}:${instanceId}`;
        const connectionsKey = `loadbalancer:connections:service:${endPoint}`;

        multi.zRem(connectionsKey, instanceKey);
        multi.del(instanceKey);

        return await multi.exec();
    });
}

/**
 * Update the status of all instances in Redis
 */
async function updateAllInstancesStatus() {
    return withRedisClient(async (client) => {
        const multi = client.multi();
        const healthyServices = new Set(); // Track all healthy services

        const allInstanceKeys = await client.keys('*:instances:*');

        if (allInstanceKeys.length === 0) {
            console.log('[CRON JOB] No instances found in Redis.');
            return;
        }

        for (const instanceKey of allInstanceKeys) {
            const instanceDetails = await client.hGetAll(instanceKey);
            const { host, port, status } = instanceDetails;

            // Perform health check by making a request to the /metrics endpoint
            const metricsUrl = `http://${host}:${port}/metrics`;
            let newStatus = status; // Default to current status if health check doesn't change

            try {
                const response = await axios.get(metricsUrl, { timeout: 10000 });

                // If the health check returns 200, mark as healthy (status 'true')
                if (response.status === 200) {
                    newStatus = 'true';
                    console.log(`${instanceKey} is healthy.`);
                } else {
                    newStatus = 'false';
                    console.log(`${instanceKey} is unhealthy (Status: ${response.status}).`);
                }
            } catch (error) {
                newStatus = 'false';
                console.log(`Failed to reach ${instanceKey} via /metrics: ${error.message}`);
            }

            // Track healthy services for cache refresh
            if (newStatus === 'true') {
                const keyParts = instanceKey.split(':');
                if (keyParts.length >= 5) {
                    const serviceEndPoint = keyParts[3]; // Extract service endpoint
                    healthyServices.add(serviceEndPoint);
                }
            }

            // Update the status to 'true' or 'false' based on health check result
            multi.hSet(instanceKey, 'status', newStatus);
        }

        // Execute all multi commands at once (batching for efficiency)
        await multi.exec();
        console.log('Status updated for all instances in Redis.');

        // Refresh cache for ALL healthy services every health check cycle
        if (healthyServices.size > 0) {
            console.log(`[CACHE] Refreshing cache for ${healthyServices.size} healthy services: ${Array.from(healthyServices).join(', ')}`);
            
            for (const serviceEndPoint of healthyServices) {
                try {
                    await routeCache.refreshServiceCache(serviceEndPoint);
                } catch (cacheError) {
                    console.log(`[CACHE] Failed to refresh cache for ${serviceEndPoint}: ${cacheError.message}`);
                }
            }
            
            console.log(`[CACHE] Cache refresh completed for healthy services`);
        } else {
            console.log('[CACHE] No healthy services to refresh cache');
        }
    });
}

module.exports = {
    storeInstances,
    incrementConnection,
    decrementConnection,
    getLeastConnectionsInstance,
    deleteInstanceFromRedis,
    deleteServiceFromRedis,
    updateAllInstancesStatus,
};
