class CreepHauler {
    static calculateTarget(roomState) {
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        const sourceOutput = roomState.sources * 10;
        return Math.min(4, Math.ceil((sourceOutput * 20) / carryCapacity)); // Reduced buffer from 50 to 20 ticks
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