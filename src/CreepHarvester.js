class CreepHarvester {
    static calculateTarget(roomState) {
        // Use number of sources instead of spawns for harvester calculation
        // Typically want 1-2 harvesters per source depending on room level
        const harvestersPerSource = roomState.roomLevel <= 2 ? 1 : 2;
        return roomState.sources * harvestersPerSource;
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },              // Early game balanced
            { cost: 300, body: [WORK, WORK, CARRY, MOVE] },        // Early game source-sitter
            { cost: 400, body: [WORK, WORK, WORK, CARRY, MOVE] },  // Better harvesting
            { cost: 550, body: [WORK, WORK, WORK, WORK, CARRY, MOVE] }, // Strong harvesting
            { cost: 700, body: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE] }, // Max harvesting
            { cost: 800, body: [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE] }  // Max harvesting + extra carry
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepHarvester;