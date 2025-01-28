class CreepHarvester {
    static calculateTarget(roomState) {
        // Each source needs 5 work parts total
        const totalWorkPartsNeeded = roomState.sources * 5;
        
        // Get list of all harvesters in this room
        const roomHarvesters = Object.values(Game.creeps).filter(creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === roomState.room.name
        );
        
        // Count existing work parts from current harvesters
        const existingWorkParts = _.sum(roomHarvesters, creep => 
            creep.getActiveBodyparts(WORK)
        );
        
        // Calculate how many more work parts we need
        const workPartsNeeded = Math.max(0, totalWorkPartsNeeded - existingWorkParts);
        
        // Get current harvester count
        const currentHarvesters = roomHarvesters.length;
        
        // Get the best possible body we can make with current energy capacity
        const bestPossibleBody = this.getBody(roomState.energyCapacity);
        const workPartsPerCreep = bestPossibleBody.filter(part => part === WORK).length;
        
        // Calculate minimum harvesters needed for remaining work parts
        const additionalHarvestersNeeded = Math.ceil(workPartsNeeded / workPartsPerCreep);
        
        // Final target is current harvesters plus additional needed
        const targetHarvesters = currentHarvesters + additionalHarvestersNeeded;
        
        console.log(`Room ${roomState.room.name} harvester calculation:`, {
            totalWorkPartsNeeded,
            existingWorkParts,
            workPartsNeeded,
            currentHarvesters,
            workPartsPerCreep,
            additionalHarvestersNeeded,
            targetHarvesters
        });
        
        return targetHarvesters;
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