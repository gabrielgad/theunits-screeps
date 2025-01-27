class CreepHarvester {
    static calculateTarget(roomState) {
        // Each source needs 5 work parts
        const workPartsNeeded = roomState.sources * 5;
        
        // Count existing work parts
        const existingWorkParts = _.sum(Object.values(Game.creeps).filter(creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === roomState.room.name
        ), creep => creep.getActiveBodyparts(WORK));
        
        // Calculate work parts per new harvester using max energy
        const body = this.getBody(roomState.energyCapacity);
        const workPartsPerHarvester = body.filter(part => part === WORK).length;
        
        // Only spawn new harvesters if we need more work parts
        const additionalWorkPartsNeeded = Math.max(0, workPartsNeeded - existingWorkParts);
        return Math.ceil(additionalWorkPartsNeeded / workPartsPerHarvester);
    }
    
    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },                    // 1 work
            { cost: 300, body: [WORK, WORK, CARRY, MOVE] },             // 2 work
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }, // 2 work, better mobility
            { cost: 550, body: [WORK, WORK, WORK, CARRY, MOVE, MOVE] }, // 3 work
            { cost: 700, body: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE] }, // 4 work
            { cost: 800, body: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE] }  // 5 work
        ];
        
        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepHarvester;