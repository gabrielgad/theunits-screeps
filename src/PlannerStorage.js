class PlannerStorage {
    constructor(room) {
        this.room = room;
        this.terrain = room.getTerrain();
        
        // Initialize memory
        if (!Memory.storagePlanner) Memory.storagePlanner = {};
        if (!Memory.storagePlanner[room.name]) Memory.storagePlanner[room.name] = {
            consideredPositions: []
        };
    }

    needsStorage(rcl) {
        if (rcl < 4) return false;
        
        return !this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_STORAGE }
        }).length;
    }

    planPositions() {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return [];

        // Calculate ideal storage location based on various factors
        const positions = [];
        const scoreMap = new Map();

        // Search in a wider radius but with more strategic placement
        for (let radius = 3; radius <= 8; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Check if position has already been considered
                    const posKey = `${spawn.pos.x + dx},${spawn.pos.y + dy}`;
                    if (Memory.storagePlanner[this.room.name].consideredPositions.includes(posKey)) {
                        continue;
                    }

                    const distance = Math.abs(dx) + Math.abs(dy);
                    if (distance > radius || distance < 3) continue;

                    const x = spawn.pos.x + dx;
                    const y = spawn.pos.y + dy;

                    if (x < 3 || x > 46 || y < 3 || y > 46) continue;

                    const pos = new RoomPosition(x, y, this.room.name);
                    if (!this.isValidStoragePosition(pos)) continue;

                    const score = this.evaluateStoragePosition(pos);
                    if (score > 0) {
                        scoreMap.set(posKey, score);
                        positions.push(pos);
                    }

                    // Mark position as considered
                    Memory.storagePlanner[this.room.name].consideredPositions.push(posKey);
                }
            }
        }

        // Sort positions by score and return the best one
        return positions.sort((a, b) => {
            const scoreA = scoreMap.get(`${a.x},${a.y}`);
            const scoreB = scoreMap.get(`${b.x},${b.y}`);
            return scoreB - scoreA;
        }).slice(0, 1);
    }

    evaluateStoragePosition(pos) {
        let score = 100; // Base score

        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Distance from spawn (shouldn't be too close or too far)
        const spawnDistance = pos.getRangeTo(spawn);
        if (spawnDistance < 3) return 0; // Too close
        if (spawnDistance > 10) score -= (spawnDistance - 10) * 5;

        // Check distance to sources
        const sources = this.room.find(FIND_SOURCES);
        let avgSourceDistance = 0;
        for (let source of sources) {
            avgSourceDistance += pos.getRangeTo(source);
        }
        avgSourceDistance /= sources.length;
        score -= avgSourceDistance * 2; // Penalize being far from sources

        // Check distance to controller
        const controllerDistance = pos.getRangeTo(this.room.controller);
        score -= controllerDistance * 1.5; // Slight penalty for being far from controller

        // Bonus for having more free adjacent spaces
        const freeSpaces = this.countFreeSpaces(pos);
        score += freeSpaces * 10;

        // Bonus for being near extensions
        const nearbyExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION &&
                        s.pos.getRangeTo(pos) <= 3
        });
        score += nearbyExtensions.length * 5;

        // Check for nearby roads
        const nearbyRoads = this.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD &&
                        s.pos.getRangeTo(pos) <= 1
        });
        score += nearbyRoads.length * 10;

        return Math.max(0, score);
    }

    isValidStoragePosition(pos) {
        // Check terrain
        if (this.terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;
        
        // Check for existing structures or construction sites
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (structures.length > 0 || sites.length > 0) return false;

        // Ensure minimum free spaces
        return this.countFreeSpaces(pos) >= 5;
    }

    countFreeSpaces(pos) {
        let freeSpaces = 0;
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const x = pos.x + dx;
                const y = pos.y + dy;
                
                if (x < 0 || x > 49 || y < 0 || y > 49) continue;
                
                if (this.terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    const newPos = new RoomPosition(x, y, this.room.name);
                    const structures = newPos.lookFor(LOOK_STRUCTURES);
                    
                    // Count as free if empty or only has roads
                    if (structures.length === 0 || 
                        structures.every(s => s.structureType === STRUCTURE_ROAD)) {
                        freeSpaces++;
                    }
                }
            }
        }
        
        return freeSpaces;
    }
}

module.exports = PlannerStorage;