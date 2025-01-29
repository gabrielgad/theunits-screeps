class PlannerRoad {
    constructor(room) {
        this.room = room;
        this.trafficMap = new PathFinder.CostMatrix();
        this.TRAFFIC_WEIGHT_THRESHOLD = 5;
    }

    shouldBuildRoads() {
        return this.room.controller.level >= 2;
    }

    planPositions() {
        const positions = new Set();
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return [];

        // 1. Analyze and plan high-traffic paths
        this.analyzeTrafficPatterns();
        this.addHighTrafficRoads(positions);

        // 2. Plan roads around structures
        this.planStructureConnections(positions);

        // 3. Plan roads to ramparts
        this.planRampartAccess(positions);

        return Array.from(positions).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
    }

    analyzeTrafficPatterns() {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        // Analyze paths to sources
        const sources = this.room.find(FIND_SOURCES);
        for (let source of sources) {
            const path = PathFinder.search(spawn.pos, { pos: source.pos, range: 1 }, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: this.getCostMatrix.bind(this)
            }).path;
            this.addWeightToPath(path, 3);
        }

        // Analyze paths to controller
        if (this.room.controller) {
            const path = PathFinder.search(spawn.pos, { pos: this.room.controller.pos, range: 3 }, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: this.getCostMatrix.bind(this)
            }).path;
            this.addWeightToPath(path, 3);
        }

        // Analyze paths between storage/containers
        const storage = this.room.storage;
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });

        if (storage) {
            for (let container of containers) {
                const path = PathFinder.search(storage.pos, { pos: container.pos, range: 1 }, {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: this.getCostMatrix.bind(this)
                }).path;
                this.addWeightToPath(path, 2);
            }
        }
    }

    addWeightToPath(path, weight) {
        for (let pos of path) {
            const currentWeight = this.trafficMap.get(pos.x, pos.y);
            this.trafficMap.set(pos.x, pos.y, currentWeight + weight);
        }
    }

    addHighTrafficRoads(positions) {
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (this.trafficMap.get(x, y) >= this.TRAFFIC_WEIGHT_THRESHOLD) {
                    const pos = new RoomPosition(x, y, this.room.name);
                    if (this.canBuildRoadAt(pos)) {
                        positions.add(`${x},${y}`);
                    }
                }
            }
        }
    }

    planStructureConnections(positions) {
        const structures = this.room.find(FIND_MY_STRUCTURES, {
            filter: struct => struct.structureType !== STRUCTURE_RAMPART
        });

        // Connect each structure to its nearest neighbor
        for (let struct of structures) {
            let nearestStruct = null;
            let shortestPath = null;
            let minLength = Infinity;

            for (let otherStruct of structures) {
                if (struct.id === otherStruct.id) continue;

                const path = PathFinder.search(struct.pos, { pos: otherStruct.pos, range: 1 }, {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: this.getCostMatrix.bind(this)
                }).path;

                if (path.length < minLength) {
                    minLength = path.length;
                    shortestPath = path;
                    nearestStruct = otherStruct;
                }
            }

            if (shortestPath) {
                for (let pos of shortestPath) {
                    if (this.canBuildRoadAt(pos)) {
                        positions.add(`${pos.x},${pos.y}`);
                    }
                }
            }
        }
    }

    planRampartAccess(positions) {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        const ramparts = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_RAMPART }
        });

        // Group nearby ramparts to avoid excessive road building
        const rampartGroups = this.groupNearbyRamparts(ramparts);

        for (let group of rampartGroups) {
            // Find center position of the group
            const centerX = Math.floor(group.reduce((sum, r) => sum + r.pos.x, 0) / group.length);
            const centerY = Math.floor(group.reduce((sum, r) => sum + r.pos.y, 0) / group.length);
            const centerPos = new RoomPosition(centerX, centerY, this.room.name);

            // Create path from spawn to rampart group
            const path = PathFinder.search(spawn.pos, { pos: centerPos, range: 1 }, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: this.getCostMatrix.bind(this)
            }).path;

            for (let pos of path) {
                if (this.canBuildRoadAt(pos)) {
                    positions.add(`${pos.x},${pos.y}`);
                }
            }
        }
    }

    groupNearbyRamparts(ramparts) {
        const groups = [];
        const assigned = new Set();

        for (let rampart of ramparts) {
            if (assigned.has(rampart.id)) continue;

            const group = [rampart];
            assigned.add(rampart.id);

            for (let other of ramparts) {
                if (!assigned.has(other.id) && rampart.pos.getRangeTo(other.pos) <= 5) {
                    group.push(other);
                    assigned.add(other.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    getCostMatrix() {
        const matrix = new PathFinder.CostMatrix();

        const structures = this.room.find(FIND_STRUCTURES);
        for (let struct of structures) {
            if (struct.structureType === STRUCTURE_ROAD) {
                matrix.set(struct.pos.x, struct.pos.y, 1);
            } else if (struct.structureType !== STRUCTURE_CONTAINER) {
                matrix.set(struct.pos.x, struct.pos.y, 255);
            }
        }

        return matrix;
    }

    canBuildRoadAt(pos) {
        if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) return false;

        const terrain = Game.map.getRoomTerrain(this.room.name);
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

        const structures = pos.lookFor(LOOK_STRUCTURES);
        return !structures.some(s => s.structureType !== STRUCTURE_ROAD);
    }
}

module.exports = PlannerRoad;