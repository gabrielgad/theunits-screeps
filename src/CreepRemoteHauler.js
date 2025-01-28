class CreepRemoteHauler {
    static calculateTarget(roomState) {
        // First check if we're even doing remote mining
        if (!roomState.remoteMiningActive) return 0;
        
        // Get profitable rooms that we actually have miners in
        const profitableRooms = roomState.profitableRooms || [];
        let totalMiners = 0;
        
        // Count actual miners working in remote rooms
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.role === 'remoteMiner' && 
                creep.memory.homeRoom === roomState.room.name &&
                profitableRooms.includes(creep.memory.targetRoom)) {
                totalMiners++;
            }
        }

        // If we have no miners yet, we don't need haulers
        if (totalMiners === 0) return 0;

        // Calculate hauler needs based on actual miners
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        const sourceOutput = totalMiners * 10; // Each miner works one source
        
        return Math.min(6, Math.ceil((sourceOutput * 30) / carryCapacity));
    }

    static getBody(energy) {
        const bodies = [
            { cost: 300, body: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 500, body: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] },
            { cost: 800, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] },
            { cost: 1000, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepRemoteHauler;