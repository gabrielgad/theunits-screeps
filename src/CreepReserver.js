class CreepReserver {
    static calculateTarget(roomState) {
        if (!roomState.controller) return 0;
        if (roomState.controller.reservation && 
            roomState.controller.reservation.ticksToEnd > 1000) return 0;
        return 1;
    }

    static getBody(energy) {
        const bodies = [
            { cost: 650, body: [CLAIM, MOVE] },
            { cost: 1300, body: [CLAIM, CLAIM, MOVE, MOVE] },
            { cost: 1950, body: [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepReserver;