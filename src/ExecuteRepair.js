class ExecuteRepair {
    static STRUCTURE_PRIORITIES = {
        [STRUCTURE_SPAWN]: 100,
        [STRUCTURE_EXTENSION]: 90,
        [STRUCTURE_TOWER]: 85,
        [STRUCTURE_STORAGE]: 80,
        [STRUCTURE_TERMINAL]: 75,
        [STRUCTURE_CONTAINER]: 70,
        [STRUCTURE_ROAD]: 60,
        [STRUCTURE_RAMPART]: 40,
        [STRUCTURE_WALL]: 40  // Set equal to ramparts
    };

    static calculatePriority(structure) {
        const basePriority = this.STRUCTURE_PRIORITIES[structure.structureType] || 50;
        const hpPercent = structure.hits / structure.hitsMax;
        
        // Different calculation for defensive structures
        if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
            // Use absolute HP for defensive structures instead of percentage
            const targetHp = 300000; // Target HP for defensive structures
            const hpFactor = Math.max(0, 1 - (structure.hits / targetHp));
            return basePriority * (1 + hpFactor);
        }
        
        // Regular structures use percentage-based priority
        const hpFactor = Math.pow(1 - hpPercent, 2);
        const urgencyBonus = hpPercent < 0.1 ? 50 : 0;
        return basePriority * (1 + hpFactor) + urgencyBonus;
    }

    static execute(creep) {
        const damagedStructures = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < 300000; // Only repair if below target
                }
                return structure.hits < structure.hitsMax;
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