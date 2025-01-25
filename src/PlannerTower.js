class PlannerTower {
    constructor(room) {
        this.room = room;
    }

    needsTowers(rcl) {
        const towers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        });
        
        // Tower limits per RCL
        const towerLimits = {
            3: 1,
            4: 1,
            5: 2,
            6: 2,
            7: 3,
            8: 6
        };
        
        return rcl >= 3 && towers.length < (towerLimits[rcl] || 0);
    }

    planPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Place tower near spawn for defense
        const area = this.room.lookForAtArea(LOOK_TERRAIN,
            spawn.pos.y - 2, spawn.pos.x - 2,
            spawn.pos.y + 2, spawn.pos.x + 2, true);
        
        let bestPos = null;
        let bestDistance = Infinity;
        
        for (let spot of area) {
            if (spot.terrain !== 'wall') {
                const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                const distance = spawn.pos.getRangeTo(pos);
                // Keep tower at least 2 spaces from spawn
                if (distance >= 2 && distance < bestDistance) {
                    bestDistance = distance;
                    bestPos = pos;
                }
            }
        }
        
        if (bestPos) positions.push(bestPos);
        return positions;
    }
}

module.exports = PlannerTower;