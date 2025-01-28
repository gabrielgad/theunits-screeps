class CreepHauler {
    static calculateTarget(roomState) {
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        
        // Calculate energy output (10 energy per tick per source)
        const sourceOutput = roomState.sources * 10;
        
        // Calculate actual round trip time
        const avgDistance = roomState.averageSourceDistance || 25; // Fallback to 25 if not provided
        const roundTripTime = (avgDistance * 2); // Basic round trip time
        const fillTime = carryCapacity / 10; // Time to fill up at source
        const tripCycleTime = roundTripTime + fillTime;
        
        // Calculate energy produced during one full trip cycle
        const energyPerCycle = sourceOutput * tripCycleTime;
        
        // Calculate base haulers needed
        // Using 1.2 as overhead factor for pathfinding and collisions
        const overheadFactor = 1.2;
        const baseHaulers = Math.ceil((energyPerCycle * overheadFactor) / carryCapacity);
        
        // Ensure minimum of 1 hauler per source for redundancy
        const minimumHaulers = roomState.sources;
        
        // Cap at 4 haulers maximum (2 per source)
        return Math.min(4, Math.max(baseHaulers, minimumHaulers));
    }

    static getBody(energy) {
        // Optimized body configurations favoring higher carry capacity
        const bodies = [
            { cost: 200, body: [CARRY, CARRY, MOVE, MOVE] },
            { cost: 300, body: [CARRY, CARRY, CARRY, MOVE, MOVE] },
            { cost: 400, body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE] },
            { cost: 500, body: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 600, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] }
        ];

        // Find the most efficient body that fits within energy constraints
        const selected = bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => {
                const currentEfficiency = (current.body.filter(part => part === CARRY).length * 50) / current.cost;
                const bestEfficiency = (best.body.filter(part => part === CARRY).length * 50) / best.cost;
                return currentEfficiency > bestEfficiency ? current : best;
            }, bodies[0]);
            
        return selected.body;
    }

    static estimateTripTime(hauler, source, storage) {
        const distance = source.pos.getRangeTo(storage);
        const roundTripDistance = distance * 2;
        const carryParts = hauler.body.filter(part => part.type === CARRY).length;
        const capacity = carryParts * 50;
        const timeToFill = capacity / 10; // capacity / energy per tick
        
        // Add small overhead for path finding and creep avoidance
        const pathfindingOverhead = Math.ceil(distance * 0.2);
        
        return roundTripDistance + timeToFill + pathfindingOverhead;
    }
    
    static analyzeHaulerEfficiency(roomState, haulers) {
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        const totalCarryCapacity = carryCapacity * haulers;
        const sourceOutput = roomState.sources * 10;
        
        return {
            energyPerTick: sourceOutput,
            haulerCapacity: carryCapacity,
            totalCapacity: totalCarryCapacity,
            theoreticalMaxDistance: Math.floor(carryCapacity / (2 * sourceOutput)),
            recommendedUpgrade: totalCarryCapacity < sourceOutput * 50 ? 'Increase hauler count or capacity' : 'Current configuration is sufficient'
        };
    }
}

module.exports = CreepHauler;