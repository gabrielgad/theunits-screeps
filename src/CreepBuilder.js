class CreepBuilder {
    static calculateTarget(roomState) {
        let target = Math.min(
            Math.ceil(roomState.constructionSites / 5),
            Math.floor(roomState.roomLevel * 1.5)
        );
        
        return Math.max(roomState.constructionSites > 0 ? 1 : 0, target);
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