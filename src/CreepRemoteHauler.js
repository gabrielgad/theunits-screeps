class CreepRemoteHauler {
    static calculateTarget(roomState) {
        const body = this.getBody(roomState.energyAvailable);
        const carryCapacity = body.filter(part => part === CARRY).length * 50;
        const sourceOutput = roomState.sources * 10;
        // Increased buffer due to longer distance
        return Math.min(6, Math.ceil((sourceOutput * 30) / carryCapacity));
    }

    static getBody(energy) {
        const bodies = [
            { cost: 300, body: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 500, body: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] },
            { cost: 800, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] },
            { cost: 1000, body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepRemoteHauler;