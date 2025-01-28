class PlannerExtension {
    constructor(room) {
        this.room = room;
        this.plannedPositions = new Set();
    }

    needsExtensions(rcl) {
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl];
        const currentExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;
        return currentExtensions < maxExtensions;
    }

    // Renamed from planLayout to findNextPosition to match the calling code
    findNextPosition(spawnPos) {
        for (let radius = 2; radius < 6; radius++) {
            for (let x = -radius; x <= radius; x++) {
                for (let y = -radius; y <= radius; y++) {
                    if (Math.abs(x) + Math.abs(y) === radius) {
                        const newX = spawnPos.x + x;
                        const newY = spawnPos.y + y;
                        const posKey = `${newX},${newY}`;
                        
                        if (this.plannedPositions.has(posKey)) continue;
                        this.plannedPositions.add(posKey);
                        
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
        return structures.length === 0 && 
               sites.length === 0 && 
               pos.lookFor(LOOK_TERRAIN)[0] !== 'wall';
    }

    getPlannedPositions() {
        return Array.from(this.plannedPositions).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
    }
}

module.exports = PlannerExtension;