class PlannerStorage {
    constructor(room) {
        this.room = room;
    }

    needsStorage(rcl) {
        if (rcl < 4) return false;
        return !this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_STORAGE }
        }).length;
    }

    planPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Search in expanding circles around spawn
        for (let radius = 3; radius <= 6; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only check positions that form a rough circle
                    if (Math.abs(Math.sqrt(dx*dx + dy*dy) - radius) > 0.5) continue;
                    
                    const x = spawn.pos.x + dx;
                    const y = spawn.pos.y + dy;
                    
                    // Skip if out of bounds
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    
                    const pos = new RoomPosition(x, y, this.room.name);
                    
                    // Check if position is valid
                    if (this.isValidStoragePosition(pos)) {
                        positions.push(pos);
                    }
                }
            }
            // Return first valid position found
            if (positions.length > 0) return positions;
        }
        return positions;
    }

    isValidStoragePosition(pos) {
        // Check terrain
        if (this.room.lookForAt(LOOK_TERRAIN, pos)[0] === 'wall') return false;
        
        // Check for existing structures or construction sites
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (structures.length > 0 || sites.length > 0) return false;
        
        // Ensure position has some free space around it
        let freeSpaces = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const newPos = new RoomPosition(
                    pos.x + dx, 
                    pos.y + dy, 
                    this.room.name
                );
                if (this.room.lookForAt(LOOK_TERRAIN, newPos)[0] !== 'wall') {
                    freeSpaces++;
                }
            }
        }
        return freeSpaces >= 5; // Require at least 5 free spaces around
    }
}

module.exports = PlannerStorage;