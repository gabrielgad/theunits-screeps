class CreepRemoteMiner {
    static calculateTarget(roomState) {
        if (!roomState.room.memory.remoteMiningActive) return 0;
        
        return roomState.sources || 0;
    }

    static getBody(energy) {
        const bodies = [
            { cost: 300, body: [WORK, WORK, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, WORK, MOVE, MOVE] },
            { cost: 550, body: [WORK, WORK, WORK, WORK, MOVE, MOVE] },
            { cost: 700, body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE] },
            { cost: 850, body: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepRemoteMiner;