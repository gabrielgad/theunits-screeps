class CreepRemoteMiner {
    static calculateTarget(roomState) {
        // First check if remote mining is active
        if (!roomState.remoteMiningActive) return 0;
        
        // Don't spawn miners if we still need scouts
        if (roomState.roomsNeedingScout && roomState.roomsNeedingScout.length > 0) return 0;

        // Get the total number of sources in profitable rooms
        const profitableRooms = roomState.profitableRooms || [];
        let totalSourceCount = 0;
        let currentMinerCount = 0;

        // Count sources in profitable rooms we can see
        for (const roomName of profitableRooms) {
            const room = Game.rooms[roomName];
            if (room) {
                totalSourceCount += room.find(FIND_SOURCES).length;
            }
        }

        // Count current miners
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.role === 'remoteMiner' && 
                creep.memory.homeRoom === roomState.room.name &&
                profitableRooms.includes(creep.memory.targetRoom)) {
                currentMinerCount++;
            }
        }

        // Return how many additional miners we need
        return Math.max(0, totalSourceCount - currentMinerCount);
    }

    static getBody(energy) {
        const bodies = [
            { cost: 300, body: [WORK, WORK, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, WORK, MOVE, MOVE] },
            { cost: 550, body: [WORK, WORK, WORK, WORK, MOVE, MOVE] },
            { cost: 700, body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE] },
            { cost: 850, body: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepRemoteMiner;