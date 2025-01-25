class PlannerExtension {
    constructor(room) {
        this.room = room;
    }

    needsExtensions(rcl) {
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl];
        const currentExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;
        return currentExtensions < maxExtensions;
    }

    findNextPosition(spawnPos) {
        const checked = new Set();
        for (let radius = 2; radius < 6; radius++) {
            for (let x = -radius; x <= radius; x++) {
                for (let y = -radius; y <= radius; y++) {
                    if (Math.abs(x) + Math.abs(y) === radius) {
                        const newX = spawnPos.x + x;
                        const newY = spawnPos.y + y;
                        const posKey = `${newX},${newY}`;
                        
                        if (checked.has(posKey)) continue;
                        checked.add(posKey);

                        const pos = new RoomPosition(newX, newY, this.room.name);
                        if (this.canBuildAt(pos)) {
                            return pos;
                        }
                    }
                }
            }
        }
        return null;
    }

    canBuildAt(pos) {
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        return structures.length === 0 && sites.length === 0 && 
               pos.lookFor(LOOK_TERRAIN)[0] !== 'wall';
    }
}

module.exports = PlannerExtension;