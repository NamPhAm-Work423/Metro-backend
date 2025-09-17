const { RouteStation, Route, Station } = require('../models/index.model');
const { Op } = require('sequelize');

class RouteStationService {
    async createRouteStation(routeStationData) {
        try {
            const routeStation = await RouteStation.create(routeStationData);
            return routeStation;
        } catch (error) {
            throw error;
        }
    }

    async createMultipleRouteStations(routeStationsData) {
        try {
            const routeStations = await RouteStation.bulkCreate(routeStationsData);
            return routeStations;
        } catch (error) {
            throw error;
        }
    }

    async getAllRouteStations(filters = {}) {
        try {
            const where = {};
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.stationId) {
                where.stationId = filters.stationId;
            }

            const routeStations = await RouteStation.findAll({
                where,
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration']
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'openTime', 'closeTime']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations;
        } catch (error) {
            throw error;
        }
    }

    async getRouteStationById(routeStationId) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId, {
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration', 'isActive']
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities', 'isActive']
                    }
                ]
            });
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            return routeStation;
        } catch (error) {
            throw error;
        }
    }

    async updateRouteStation(routeStationId, updateData) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId);
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            const updatedRouteStation = await routeStation.update(updateData);
            return updatedRouteStation;
        } catch (error) {
            throw error;
        }
    }

    async deleteRouteStation(routeStationId) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId);
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            await routeStation.destroy();
            return { message: 'RouteStation deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getStationsByRoute(routeId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { routeId },
                include: [
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities', 'openTime', 'closeTime', 'isActive']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations.map(rs => ({
                routeStationId: rs.routeStationId,
                sequence: rs.sequence,
                station: rs.Station
            }));
        } catch (error) {
            throw error;
        }
    }

    async getRoutesByStation(stationId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { stationId },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration', 'isActive']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations.map(rs => ({
                routeStationId: rs.routeStationId,
                sequence: rs.sequence,
                route: rs.Route
            }));
        } catch (error) {
            throw error;
        }
    }

    async setupCompleteRoute(routeId, stationSequences) {
        try {
            // Validate that route exists
            const route = await Route.findByPk(routeId);
            if (!route) {
                throw new Error('Route not found');
            }

            // Validate that all stations exist
            const stationIds = stationSequences.map(item => item.stationId);
            const stations = await Station.findAll({
                where: { stationId: { [Op.in]: stationIds } }
            });

            if (stations.length !== stationIds.length) {
                throw new Error('One or more stations not found');
            }

            // Validate sequence numbers are consecutive
            const sequences = stationSequences.map(item => item.sequence).sort((a, b) => a - b);
            for (let i = 0; i < sequences.length; i++) {
                if (sequences[i] !== i + 1) {
                    throw new Error('Sequences must be consecutive starting from 1');
                }
            }

            // Remove existing route-station associations
            await RouteStation.destroy({ where: { routeId } });

            // Create new associations
            const routeStationsData = stationSequences.map(item => ({
                routeId,
                stationId: item.stationId,
                sequence: item.sequence
            }));

            const createdRouteStations = await RouteStation.bulkCreate(routeStationsData);
            
            return {
                message: 'Route setup completed successfully',
                routeStations: createdRouteStations
            };
        } catch (error) {
            throw error;
        }
    }

    async getRoutePathWithDetails(routeId) {
        try {
            const route = await Route.findByPk(routeId, {
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location', 'facilities', 'openTime', 'closeTime']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ]
            });

            if (!route) {
                throw new Error('Route not found');
            }

            return {
                routeInfo: {
                    routeId: route.routeId,
                    name: route.name,
                    originId: route.originId,
                    destinationId: route.destinationId,
                    distance: route.distance,
                    duration: route.duration,
                    isActive: route.isActive
                },
                path: route.stations.map(rs => ({
                    sequence: rs.sequence,
                    station: rs.Station
                })),
                totalStations: route.stations.length
            };
        } catch (error) {
            throw error;
        }
    }

    async findRoutesBetweenTwoStations(originStationId, destinationStationId) {
        try {
            // Find routes that contain both stations
            const routesWithOrigin = await RouteStation.findAll({
                where: { stationId: originStationId },
                attributes: ['routeId', 'sequence']
            });

            const routesWithDestination = await RouteStation.findAll({
                where: { stationId: destinationStationId },
                attributes: ['routeId', 'sequence']
            });

            // Find common routes
            const commonRoutes = routesWithOrigin.filter(origin => 
                routesWithDestination.some(dest => 
                    dest.routeId === origin.routeId && dest.sequence > origin.sequence
                )
            );

            if (commonRoutes.length === 0) {
                const shortest = await this.findShortestPathWithTransfers(originStationId, destinationStationId, 2);
                return { shortestPath: shortest };
            }

            // Get full route details for common routes
            const routeIds = commonRoutes.map(route => route.routeId);
            const routes = await Route.findAll({
                where: { 
                    routeId: { [Op.in]: routeIds },
                    isActive: true
                },
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ]
            });

            return routes.map(route => {
                const originStation = route.stations.find(rs => rs.stationId === originStationId);
                const destinationStation = route.stations.find(rs => rs.stationId === destinationStationId);
                
                return {
                    routeInfo: {
                        routeId: route.routeId,
                        name: route.name,
                        distance: route.distance,
                        duration: route.duration
                    },
                    originSequence: originStation.sequence,
                    destinationSequence: destinationStation.sequence,
                    stationsBetween: route.stations.filter(rs => 
                        rs.sequence >= originStation.sequence && rs.sequence <= destinationStation.sequence
                    )
                };
            });
        } catch (error) {
            throw error;
        }
    }

    async validateRouteSequence(routeId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { routeId },
                order: [['sequence', 'ASC']]
            });

            if (routeStations.length === 0) {
                return { valid: false, message: 'No stations found for this route' };
            }

            // Check if sequences are consecutive starting from 1
            for (let i = 0; i < routeStations.length; i++) {
                if (routeStations[i].sequence !== i + 1) {
                    return { 
                        valid: false, 
                        message: `Invalid sequence at position ${i + 1}. Expected ${i + 1}, found ${routeStations[i].sequence}` 
                    };
                }
            }

            return { 
                valid: true, 
                message: 'Route sequence is valid',
                totalStations: routeStations.length
            };
        } catch (error) {
            throw error;
        }
    }

    async reorderRouteStations(routeId, newSequences) {
        try {
            // Validate input
            const routeStations = await RouteStation.findAll({ where: { routeId } });
            
            if (routeStations.length !== newSequences.length) {
                throw new Error('Number of sequences must match existing route stations');
            }

            // Update sequences
            const updatePromises = newSequences.map(item => 
                RouteStation.update(
                    { sequence: item.sequence },
                    { where: { routeStationId: item.routeStationId, routeId } }
                )
            );

            await Promise.all(updatePromises);

            // Validate the new sequence
            const validation = await this.validateRouteSequence(routeId);
            
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            return { 
                message: 'Route stations reordered successfully',
                validation
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find shortest path between two stations allowing transfers using Dijkstra.
     * Edge weight = 1 per adjacent station; adding transferPenalty when switching routeId.
     * Returns path (stations in order), totalCost, transfers count, and segments by route.
     */
    async findShortestPathWithTransfers(originStationId, destinationStationId, transferPenalty = 2) {
        try {
            if (!originStationId || !destinationStationId) {
                throw new Error('originStationId and destinationStationId are required');
            }

            // 1) Build adjacency list from RouteStation sequences per route
            const all = await RouteStation.findAll({
                attributes: ['routeId', 'stationId', 'sequence'],
                order: [['routeId', 'ASC'], ['sequence', 'ASC']]
            });

            if (!all || all.length === 0) {
                return { path: [], totalCost: Infinity, transfers: 0, segments: [] };
            }

            /** neighbors: stationId -> Array<{ to: stationId, routeId: string, weight: number }> */
            const neighbors = new Map();
            const addEdge = (from, to, routeId) => {
                if (!neighbors.has(from)) neighbors.set(from, []);
                neighbors.get(from).push({ to, routeId, weight: 1 });
            };

            // Group by routeId
            const byRoute = new Map();
            for (const rs of all) {
                if (!byRoute.has(rs.routeId)) byRoute.set(rs.routeId, []);
                byRoute.get(rs.routeId).push({ stationId: rs.stationId, sequence: rs.sequence });
            }
            // For each route, connect consecutive stations bidirectionally
            for (const [routeId, stations] of byRoute.entries()) {
                stations.sort((a, b) => a.sequence - b.sequence);
                for (let i = 0; i < stations.length - 1; i++) {
                    const a = stations[i].stationId;
                    const b = stations[i + 1].stationId;
                    addEdge(a, b, routeId);
                    addEdge(b, a, routeId);
                }
            }

            if (!neighbors.has(originStationId) || !neighbors.has(destinationStationId)) {
                return { path: [], totalCost: Infinity, transfers: 0, segments: [] };
            }

            // 2) Dijkstra over (stationId, routeId) state space
            const keyOf = (stationId, routeId) => `${stationId}|${routeId || '-'}`;
            const dist = new Map();
            const prev = new Map(); // key -> { stationId, routeId }

            // Simple binary heap priority queue implementation
            class MinHeap {
                constructor() { this.arr = []; }
                push(node) { this.arr.push(node); this.#up(this.arr.length - 1); }
                pop() { if (this.arr.length === 0) return null; const top = this.arr[0]; const last = this.arr.pop(); if (this.arr.length) { this.arr[0] = last; this.#down(0); } return top; }
                size() { return this.arr.length; }
                #up(i) { while (i > 0) { const p = Math.floor((i - 1) / 2); if (this.arr[p].dist <= this.arr[i].dist) break; [this.arr[p], this.arr[i]] = [this.arr[i], this.arr[p]]; i = p; } }
                #down(i) { const n = this.arr.length; while (true) { let s = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < n && this.arr[l].dist < this.arr[s].dist) s = l; if (r < n && this.arr[r].dist < this.arr[s].dist) s = r; if (s === i) break; [this.arr[s], this.arr[i]] = [this.arr[i], this.arr[s]]; i = s; } }
            }

            const heap = new MinHeap();
            // Start with unknown route at origin (no penalty for first edge)
            heap.push({ stationId: originStationId, routeId: null, dist: 0 });
            dist.set(keyOf(originStationId, null), 0);

            let bestKeyAtDestination = null;

            while (heap.size() > 0) {
                const cur = heap.pop();
                const curKey = keyOf(cur.stationId, cur.routeId);
                // Skip stale
                if (cur.dist !== dist.get(curKey)) continue;

                if (cur.stationId === destinationStationId) { bestKeyAtDestination = curKey; break; }

                const edges = neighbors.get(cur.stationId) || [];
                for (const edge of edges) {
                    let w = edge.weight;
                    if (cur.routeId !== null && cur.routeId !== edge.routeId) {
                        w += Number(transferPenalty) || 0;
                    }
                    const nextKey = keyOf(edge.to, edge.routeId);
                    const newDist = cur.dist + w;
                    if (newDist < (dist.has(nextKey) ? dist.get(nextKey) : Infinity)) {
                        dist.set(nextKey, newDist);
                        prev.set(nextKey, { stationId: cur.stationId, routeId: cur.routeId });
                        heap.push({ stationId: edge.to, routeId: edge.routeId, dist: newDist });
                    }
                }
            }

            if (!bestKeyAtDestination) {
                return { path: [], totalCost: Infinity, transfers: 0, segments: [] };
            }

            // 3) Reconstruct path (stationId sequence and route segments)
            const pathKeys = [];
            let curKey = bestKeyAtDestination;
            while (curKey) {
                pathKeys.push(curKey);
                const p = prev.get(curKey);
                if (!p) break;
                curKey = keyOf(p.stationId, p.routeId);
            }
            pathKeys.reverse();

            const pathStations = pathKeys.map(k => ({
                stationId: k.split('|')[0],
                routeId: (k.split('|')[1] === '-') ? null : k.split('|')[1]
            }));

            // Collapse into segments by routeId
            const segments = [];
            for (const node of pathStations) {
                if (segments.length === 0) {
                    segments.push({ routeId: node.routeId, stations: [node.stationId] });
                } else {
                    const last = segments[segments.length - 1];
                    if (last.routeId === node.routeId) {
                        last.stations.push(node.stationId);
                    } else {
                        segments.push({ routeId: node.routeId, stations: [node.stationId] });
                    }
                }
            }

            // Cleanup: segments may start with null for origin; merge if needed
            const cleaned = [];
            for (const seg of segments) {
                if (seg.routeId === null) {
                    // merge into next if exists
                    if (cleaned.length === 0) continue;
                } else {
                    cleaned.push(seg);
                }
            }

            const totalCost = dist.get(bestKeyAtDestination);
            let transfers = 0;
            for (let i = 1; i < pathStations.length; i++) {
                const prevNode = pathStations[i - 1];
                const node = pathStations[i];
                if (prevNode.routeId && node.routeId && prevNode.routeId !== node.routeId) transfers++;
            }

            // Load station details for result
            const stationIds = [...new Set(pathStations.map(p => p.stationId))];
            const stations = await Station.findAll({ where: { stationId: { [Op.in]: stationIds } } });
            const stationMap = new Map(stations.map(s => [s.stationId, s]));

            const detailedPath = pathStations.map(p => ({
                station: stationMap.get(p.stationId) || { stationId: p.stationId },
                viaRouteId: p.routeId
            }));

            return {
                path: detailedPath,
                totalCost,
                transfers,
                segments: cleaned
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new RouteStationService();
