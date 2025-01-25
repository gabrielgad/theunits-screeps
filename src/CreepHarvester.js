class CreepHarvester {
    static calculateTarget(roomState) {
        return roomState.spawns * 2;
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