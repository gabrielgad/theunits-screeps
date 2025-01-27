class CreepBuilder {
    static calculateTarget(roomState) {
        const sites = roomState.room.find(FIND_CONSTRUCTION_SITES);
        const totalWork = _.sum(sites, site => site.progressTotal - site.progress);
        
        const body = this.getBody(roomState.energyCapacity);
        const workParts = body.filter(part => part === WORK).length;
        const workPerTick = workParts * 5; // Each WORK does 5 construction/tick
        
        return Math.max(1, Math.min(3, Math.ceil(totalWork / (workPerTick * 50)))); // 50 ticks buffer
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },
            { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 500, body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 600, body: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 800, body: [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] }
        ];

        const selected = bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]);
        return selected.body;
    }
}

module.exports = CreepBuilder;