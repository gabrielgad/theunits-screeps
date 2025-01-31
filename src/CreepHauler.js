class CreepHauler {
    static calculateTarget(roomState) {
        // Calculate based on number of sources and room level
        // Scale up more aggressively with room level
        let target = Math.min(
            roomState.sources * 2,  // Double the base haulers per source
            Math.floor(roomState.roomLevel * 1.8)  // Increased from 1.2 to 1.8
        );
        
        // Ensure at least 1 hauler if we have active sources
        return Math.max(roomState.sources > 0 ? 1 : 0, target);
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
}

module.exports = CreepHauler;