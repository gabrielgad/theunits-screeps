class PlannerExtension {
    constructor(room) {
        this.room = room;
        this.terrain = room.getTerrain();
        
        if (!Memory.extensionPlanner) Memory.extensionPlanner = {};
        if (!Memory.extensionPlanner[room.name]) Memory.extensionPlanner[room.name] = {
            plannedPositions: []
        };
    }

    needsExtensions(rcl) {
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl];
        const currentExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;
        
        const extensionSites = this.room.find(FIND_CONSTRUCTION_SITES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;
        
        return (currentExtensions + extensionSites) < maxExtensions;
    }

    findNextPosition(spawnPos) {
        const memory = Memory.extensionPlanner[this.room.name];
        
        // Try each radius from 2 to 8
        for (let radius = 2; radius <= 8; radius++) {
            const positions = this.generatePositionsForRadius(spawnPos, radius);
            
            for (let pos of positions) {
                const posKey = `${pos.x},${pos.y}`;

                if (memory.plannedPositions.includes(posKey)) continue;
                if (pos.x < 2 || pos.x > 47 || pos.y < 2 || pos.y > 47) continue;
                if (this.terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) continue;

                if (this.canBuildAt(pos)) {
                    memory.plannedPositions.push(posKey);
                    return pos;
                }
            }
        }

        // If no position found in main patterns, try a spiral pattern
        const spiralPositions = this.generateSpiralPositions(spawnPos, 10);
        
        for (let pos of spiralPositions) {
            const posKey = `${pos.x},${pos.y}`;

            if (memory.plannedPositions.includes(posKey)) continue;
            if (pos.x < 2 || pos.x > 47 || pos.y < 2 || pos.y > 47) continue;
            if (this.terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) continue;

            if (this.canBuildAt(pos)) {
                memory.plannedPositions.push(posKey);
                return pos;
            }
        }

        return null;
    }

    generatePositionsForRadius(spawnPos, radius) {
        const positions = [];
        
        // Generate diamond pattern for this radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only include positions that form a diamond pattern
                if (Math.abs(dx) + Math.abs(dy) === radius) {
                    positions.push(new RoomPosition(
                        spawnPos.x + dx,
                        spawnPos.y + dy,
                        this.room.name
                    ));
                }
            }
        }

        return positions;
    }

    generateSpiralPositions(spawnPos, maxRadius) {
        const positions = [];
        let x = 0;
        let y = 0;
        let dx = 0;
        let dy = -1;
        
        for (let i = 0; i < Math.pow(maxRadius * 2 + 1, 2); i++) {
            if ((-maxRadius <= x && x <= maxRadius) && (-maxRadius <= y && y <= maxRadius)) {
                positions.push(new RoomPosition(
                    spawnPos.x + x,
                    spawnPos.y + y,
                    this.room.name
                ));
            }
            
            if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1-y)) {
                // Change direction
                [dx, dy] = [-dy, dx];
            }
            x += dx;
            y += dy;
        }
        
        return positions;
    }

    canBuildAt(pos) {
        // Check for existing structures and construction sites
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        
        if (structures.length > 0 || sites.length > 0) return false;

        // Count nearby extensions
        let nearbyExtensions = 0;
        const maxNearbyExtensions = 2; // Allow up to 2 adjacent extensions

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const nearbyX = pos.x + dx;
                const nearbyY = pos.y + dy;
                
                if (nearbyX < 1 || nearbyX > 48 || nearbyY < 1 || nearbyY > 48) continue;
                
                const nearbyPos = new RoomPosition(nearbyX, nearbyY, pos.roomName);
                const nearbyStructures = nearbyPos.lookFor(LOOK_STRUCTURES);
                
                for (let structure of nearbyStructures) {
                    if (structure.structureType === STRUCTURE_EXTENSION) {
                        nearbyExtensions++;
                        if (nearbyExtensions > maxNearbyExtensions) return false;
                    }
                }
            }
        }

        return true;
    }

    getPlannedPositions() {
        return Memory.extensionPlanner[this.room.name].plannedPositions.map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
    }
}

module.exports = PlannerExtension;