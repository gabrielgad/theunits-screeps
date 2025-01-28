class CreepHauler {
    static calculateTarget(roomState) {
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        
        // Calculate base energy output (10 energy per tick per source)
        const sourceOutput = roomState.sources * 10;
        
        // Increased buffer to 50 ticks to account for travel time and inefficiencies
        const timeBuffer = 50;
        
        // Add overhead factor to account for:
        // - Pathfinding inefficiencies
        // - Creep collisions
        // - Varying distances
        // - Source harvesting gaps
        const overheadFactor = 1.5;
        
        // Calculate haulers needed with more generous assumptions
        const baseHaulers = Math.ceil((sourceOutput * timeBuffer * overheadFactor) / carryCapacity);
        
        // Ensure minimum of 2 haulers per source for redundancy
        const minimumHaulers = Math.max(2, Math.floor(roomState.sources * 2));
        
        // Take the higher value between calculated need and minimum per source
        // Cap at 8 haulers maximum
        return Math.min(8, Math.max(baseHaulers, minimumHaulers));
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [CARRY, CARRY, MOVE, MOVE] },                    // Basic hauler: 100 capacity
            { cost: 300, body: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },       // 150 capacity
            { cost: 400, body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] }, // 200 capacity
            { cost: 500, body: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] }, // 250 capacity
            { cost: 600, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] }, // 300 capacity
            { cost: 700, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] }, // 350 capacity
            { cost: 800, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] } // 400 capacity
        ];

        const selected = bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]);
        return selected.body;
    }

    // Helper method to estimate actual trip time for debugging
    static estimateTripTime(hauler, source, storage) {
        const distance = source.pos.getRangeTo(storage);
        const roundTripDistance = distance * 2;
        const timeToFill = 50 / 10; // 50 capacity per CARRY part / 10 energy per tick
        return roundTripDistance + timeToFill;
    }
}

module.exports = CreepHauler;