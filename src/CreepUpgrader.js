class CreepUpgrader {
    static calculateTarget(roomState) {
        const baseUpgraders = Math.max(1, Math.floor(roomState.roomLevel * 0.7));
        const energyRatio = roomState.energyCapacity / 300;
        
        return Math.floor(baseUpgraders * Math.min(energyRatio, 2));
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },
            { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepUpgrader;