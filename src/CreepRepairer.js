class CreepRepairer {
    static calculateTarget(roomState) {
        const structures = roomState.room.find(FIND_STRUCTURES, {
            filter: structure => {
                return structure.hits < structure.hitsMax && 
                       structure.structureType !== STRUCTURE_WALL && 
                       structure.structureType !== STRUCTURE_RAMPART;
            }
        });
        
        let damageRatio = structures.reduce((sum, structure) => {
            return sum + (1 - (structure.hits / structure.hitsMax));
        }, 0);
        
        let target = Math.min(
            Math.ceil(damageRatio / 2),
            Math.floor(roomState.roomLevel * 1.2)
        );
        
        return Math.max(damageRatio > 0 ? 1 : 0, target);
    }

    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },
            { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 500, body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] }
        ];

        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepRepairer;