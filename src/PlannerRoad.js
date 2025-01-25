class PlannerRoad {
    constructor(room) {
        this.room = room;
    }

    shouldBuildRoads() {
        return this.room.controller.level >= 2;
    }

    planPositions() {
        const positions = new Set();
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return [];

        this.planCriticalPaths(positions);
        this.planExtensionNetwork(positions);

        // Convert Set back to RoomPositions
        return Array.from(positions).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
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