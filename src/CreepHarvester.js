class CreepHarvester {
    static calculateTarget(roomState) {
        // Calculate how many work parts we're getting with current energy
        const body = this.getBody(roomState.energyAvailable);
        const workParts = body.filter(part => part === WORK).length;
        
        // Each source needs 5 work parts total for optimal harvesting
        const workPartsNeeded = roomState.sources * 5;
        
        // Calculate needed harvesters based on work parts per harvester
        return Math.ceil(workPartsNeeded / workParts);
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