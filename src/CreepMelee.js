class CreepMelee {
    static calculateTarget(roomState) {
        const hostilePresence = roomState.room.find(FIND_HOSTILE_CREEPS).length > 0;
        const baseMelee = Math.floor(roomState.roomLevel * 0.5);
        return hostilePresence ? baseMelee + 2 : baseMelee;
    }

    static getBody(energy) {
        const bodies = [
            { cost: 260, body: [ATTACK, MOVE, TOUGH, MOVE] },
            { cost: 390, body: [ATTACK, ATTACK, MOVE, MOVE, TOUGH, TOUGH] },
            { cost: 520, body: [ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, TOUGH] },
            { cost: 650, body: [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepMelee;