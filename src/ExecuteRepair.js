class ExecuteRepair {
    static STRUCTURE_PRIORITIES = {
        [STRUCTURE_SPAWN]: 100,
        [STRUCTURE_EXTENSION]: 90,
        [STRUCTURE_TOWER]: 85,
        [STRUCTURE_STORAGE]: 80,
        [STRUCTURE_TERMINAL]: 75,
        [STRUCTURE_CONTAINER]: 70,
        [STRUCTURE_ROAD]: 50,    // Lowered from 60
        [STRUCTURE_RAMPART]: 30, // Lowered from 40
        [STRUCTURE_WALL]: 25     // Lowered from 40
    };

    static calculatePriority(structure) {
        const basePriority = this.STRUCTURE_PRIORITIES[structure.structureType] || 50;
        const hpPercent = structure.hits / structure.hitsMax;
        
        // Defensive structures
        if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
            const targetHp = 100000; // Lowered from 300000 for early game
            const hpFactor = Math.max(0, 1 - (structure.hits / targetHp));
            return basePriority * (1 + hpFactor * 0.5); // Reduced multiplier
        }
        
        // Regular structures
        const hpFactor = Math.pow(1 - hpPercent, 3); // Increased power for more extreme scaling
        const urgencyBonus = hpPercent < 0.3 ? 40 : 0; // Changed threshold and bonus
        return basePriority * (1 + hpFactor) + urgencyBonus;
    }

    static execute(creep) {
        const damagedStructures = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < 100000; // Lowered target
                }
                // Ignore nearly-full structures
                return structure.hits < structure.hitsMax * 0.9;
            }
        });

        const prioritizedTargets = damagedStructures
            .map(structure => ({
                structure: structure,
                priority: this.calculatePriority(structure)
            }))
            .sort((a, b) => b.priority - a.priority);

        const target = prioritizedTargets.length > 0 ? 
            prioritizedTargets[0].structure : null;

        if(target) {
            if(creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            creep.room.visual.text(
                `${Math.round(prioritizedTargets[0].priority)}`,
                target.pos.x,
                target.pos.y,
                {color: 'green', font: 0.5}
            );
        } else {
            const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if(constructionSite) {
                if(creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(constructionSite, {
                        visualizePathStyle: {stroke: '#ffffff'}
                    });
                }
            }
        }
    }
}

module.exports = ExecuteRepair;