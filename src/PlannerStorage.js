class PlannerStorage {
    constructor(room) {
        this.room = room;
    }

    needsStorage(rcl) {
        if (rcl < 4) return false;  // Storage unlocks at RCL 4
        
        const storage = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_STORAGE }
        });
        
        return storage.length === 0;
    }

    planPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Place storage near spawn but not too close
        const area = this.room.lookForAtArea(LOOK_TERRAIN,
            spawn.pos.y - 3, spawn.pos.x - 3,
            spawn.pos.y + 3, spawn.pos.x + 3, true);
        
        let bestPos = null;
        let bestDistance = Infinity;
        
        for (let spot of area) {
            if (spot.terrain !== 'wall') {
                const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                const distance = spawn.pos.getRangeTo(pos);
                // Keep storage 2-3 spaces from spawn
                if (distance >= 2 && distance <= 3 && distance < bestDistance) {
                    bestDistance = distance;
                    bestPos = pos;
                }
            }
        }
        
        if (bestPos) positions.push(bestPos);
        return positions;
    }
}

module.exports = PlannerStorage;