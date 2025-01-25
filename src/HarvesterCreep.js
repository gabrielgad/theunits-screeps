class HarvesterCreep {
    static calculateTarget(roomState) {
        let target = roomState.sources * 2;
        
        if (roomState.roomLevel >= 3) {
            target += Math.floor(roomState.roomLevel * 0.5);
        }
        
        return target;
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },
            { cost: 300, body: [WORK, WORK, CARRY, MOVE] },
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE] },
            { cost: 500, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = HarvesterCreep;