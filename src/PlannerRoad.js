class PlannerRoad {
    constructor(room) {
        this.room = room;
        this.trafficMap = new PathFinder.CostMatrix();
        this.TRAFFIC_WEIGHT_THRESHOLD = 5; // Minimum traffic weight to consider for road placement
    }

    shouldBuildRoads() {
        return this.room.controller.level >= 2;
    }

    planPositions() {
        const positions = new Set();
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return [];

        this.analyzeTrafficPatterns();
        this.planCriticalPaths(positions);
        this.planExtensionNetwork(positions);
        this.planHighTrafficPaths(positions);

        return Array.from(positions).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
    }

    analyzeTrafficPatterns() {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Analyze harvester paths
        this.analyzeHarvesterPaths(spawn);
        
        // Analyze hauler paths
        this.analyzeHaulerPaths();
        
        // Analyze upgrader paths
        this.analyzeUpgraderPaths(spawn);
        
        // Analyze repairer paths
        this.analyzeRepairerPaths(spawn);
    }

    analyzeHarvesterPaths(spawn) {
        const sources = this.room.find(FIND_SOURCES);
        for (let source of sources) {
            const harvestPath = PathFinder.search(
                spawn.pos,
                { pos: source.pos, range: 1 },
                {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: this.getRoomCallback.bind(this)
                }
            ).path;

            for (let pos of harvestPath) {
                const currentWeight = this.trafficMap.get(pos.x, pos.y);
                this.trafficMap.set(pos.x, pos.y, currentWeight + 3);
            }
        }
    }

    analyzeHaulerPaths() {
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });
        const storage = this.room.storage;

        if (storage) {
            for (let container of containers) {
                const haulerPath = PathFinder.search(
                    container.pos,
                    { pos: storage.pos, range: 1 },
                    {
                        plainCost: 2,
                        swampCost: 10,
                        roomCallback: this.getRoomCallback.bind(this)
                    }
                ).path;

                for (let pos of haulerPath) {
                    const currentWeight = this.trafficMap.get(pos.x, pos.y);
                    this.trafficMap.set(pos.x, pos.y, currentWeight + 2);
                }
            }
        }
    }

    analyzeUpgraderPaths(spawn) {
        if (this.room.controller) {
            const upgraderPath = PathFinder.search(
                spawn.pos,
                { pos: this.room.controller.pos, range: 3 },
                {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: this.getRoomCallback.bind(this)
                }
            ).path;

            for (let pos of upgraderPath) {
                const currentWeight = this.trafficMap.get(pos.x, pos.y);
                this.trafficMap.set(pos.x, pos.y, currentWeight + 2);
            }
        }
    }

    analyzeRepairerPaths(spawn) {
        // Get all ramparts and walls
        const defensiveStructures = this.room.find(FIND_STRUCTURES, {
            filter: struct => 
                struct.structureType === STRUCTURE_RAMPART || 
                struct.structureType === STRUCTURE_WALL
        });

        // Group structures into clusters to optimize repair routes
        const clusters = this.groupDefensiveStructures(defensiveStructures);

        // For each cluster, create a path from spawn to the center of the cluster
        for (let cluster of clusters) {
            // Calculate cluster center
            const centerX = Math.floor(cluster.reduce((sum, struct) => sum + struct.pos.x, 0) / cluster.length);
            const centerY = Math.floor(cluster.reduce((sum, struct) => sum + struct.pos.y, 0) / cluster.length);
            const centerPos = new RoomPosition(centerX, centerY, this.room.name);

            const repairPath = PathFinder.search(
                spawn.pos,
                { pos: centerPos, range: 2 },
                {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: this.getRoomCallback.bind(this)
                }
            ).path;

            // Add higher weight for repairer paths since they're frequent and critical
            for (let pos of repairPath) {
                const currentWeight = this.trafficMap.get(pos.x, pos.y);
                this.trafficMap.set(pos.x, pos.y, currentWeight + 4); // Higher weight for repair routes
            }

            // Add connecting paths between structures in the cluster
            for (let i = 0; i < cluster.length - 1; i++) {
                const connectPath = PathFinder.search(
                    cluster[i].pos,
                    { pos: cluster[i + 1].pos, range: 1 },
                    {
                        plainCost: 2,
                        swampCost: 10,
                        roomCallback: this.getRoomCallback.bind(this)
                    }
                ).path;

                for (let pos of connectPath) {
                    const currentWeight = this.trafficMap.get(pos.x, pos.y);
                    this.trafficMap.set(pos.x, pos.y, currentWeight + 2); // Lower weight for connections
                }
            }
        }
    }

    groupDefensiveStructures(structures) {
        const clusters = [];
        const maxClusterDistance = 5; // Maximum distance between structures in a cluster
        const visited = new Set();

        for (let struct of structures) {
            if (visited.has(struct.id)) continue;

            const cluster = [struct];
            visited.add(struct.id);

            // Find all nearby structures
            for (let otherStruct of structures) {
                if (!visited.has(otherStruct.id) && 
                    struct.pos.getRangeTo(otherStruct.pos) <= maxClusterDistance) {
                    cluster.push(otherStruct);
                    visited.add(otherStruct.id);
                }
            }

            clusters.push(cluster);
        }

        return clusters;
    }

    planHighTrafficPaths(positions) {
        // Add roads on positions with high traffic
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (this.trafficMap.get(x, y) >= this.TRAFFIC_WEIGHT_THRESHOLD) {
                    // Check if position is buildable
                    const pos = new RoomPosition(x, y, this.room.name);
                    if (this.isPositionBuildable(pos)) {
                        positions.add(`${x},${y}`);
                    }
                }
            }
        }
    }

    isPositionBuildable(pos) {
        // Check if position is already occupied by a structure
        const structures = pos.lookFor(LOOK_STRUCTURES);
        if (structures.length > 0 && structures[0].structureType !== STRUCTURE_ROAD) {
            return false;
        }

        // Check terrain
        const terrain = Game.map.getRoomTerrain(this.room.name);
        return terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL;
    }

    getRoomCallback(roomName) {
        const costMatrix = new PathFinder.CostMatrix();
        
        // Add existing structures to cost matrix
        const structures = this.room.find(FIND_STRUCTURES);
        for (let struct of structures) {
            if (struct.structureType === STRUCTURE_ROAD) {
                costMatrix.set(struct.pos.x, struct.pos.y, 1);
            } else if (struct.structureType !== STRUCTURE_CONTAINER) {
                costMatrix.set(struct.pos.x, struct.pos.y, 255);
            }
        }

        // Add construction sites
        const sites = this.room.find(FIND_CONSTRUCTION_SITES);
        for (let site of sites) {
            if (site.structureType !== STRUCTURE_ROAD) {
                costMatrix.set(site.pos.x, site.pos.y, 255);
            }
        }

        return costMatrix;
    }

    planCriticalPaths(positions) {
        // Get all important structures we need to connect
        const sources = this.room.find(FIND_SOURCES);
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });
        
        const criticalPoints = [
            this.room.find(FIND_MY_SPAWNS)[0],
            this.room.controller,
            ...sources,
            ...containers
        ];

        // Connect each critical point to its nearest neighbor
        for (let i = 0; i < criticalPoints.length; i++) {
            let nearestDistance = Infinity;
            let nearestPath = null;

            for (let j = i + 1; j < criticalPoints.length; j++) {
                const path = criticalPoints[i].pos.findPathTo(criticalPoints[j].pos, {
                    ignoreCreeps: true,
                    swampCost: 2,
                    plainCost: 2,
                    costCallback: this.getStructureCostMatrix.bind(this)
                });

                if (path.length < nearestDistance) {
                    nearestDistance = path.length;
                    nearestPath = path;
                }
            }

            if (nearestPath) {
                for (let step of nearestPath) {
                    positions.add(`${step.x},${step.y}`);
                }
            }
        }
    }

    planExtensionNetwork(positions) {
        const extensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        });

        if (extensions.length === 0) return;

        // Find the center point of all extensions
        const centerX = Math.floor(extensions.reduce((sum, ext) => sum + ext.pos.x, 0) / extensions.length);
        const centerY = Math.floor(extensions.reduce((sum, ext) => sum + ext.pos.y, 0) / extensions.length);
        const centerPos = new RoomPosition(centerX, centerY, this.room.name);

        // Connect center to nearest existing road
        let nearestRoadPos = null;
        let minDistance = Infinity;

        for (let posStr of positions) {
            const [x, y] = posStr.split(',').map(Number);
            const roadPos = new RoomPosition(x, y, this.room.name);
            const distance = centerPos.getRangeTo(roadPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestRoadPos = roadPos;
            }
        }

        if (nearestRoadPos) {
            const pathToRoad = centerPos.findPathTo(nearestRoadPos, {
                ignoreCreeps: true,
                swampCost: 2
            });
            for (let step of pathToRoad) {
                positions.add(`${step.x},${step.y}`);
            }
        }
    }

    getStructureCostMatrix(roomName, costMatrix) {
        const structures = this.room.find(FIND_STRUCTURES);
        for (let struct of structures) {
            if (struct.structureType !== STRUCTURE_ROAD) {
                costMatrix.set(struct.pos.x, struct.pos.y, 255);
            }
        }
        return costMatrix;
    }
}

module.exports = PlannerRoad;