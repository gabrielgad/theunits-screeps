class ExecuteRepair {
    // Define structure type priorities (higher = more important)
    static STRUCTURE_PRIORITIES = {
        [STRUCTURE_SPAWN]: 100,
        [STRUCTURE_EXTENSION]: 90,
        [STRUCTURE_TOWER]: 85,
        [STRUCTURE_STORAGE]: 80,
        [STRUCTURE_TERMINAL]: 75,
        [STRUCTURE_CONTAINER]: 70,
        [STRUCTURE_ROAD]: 60,
        [STRUCTURE_RAMPART]: 40,
        [STRUCTURE_WALL]: 30
    };

    // Calculate priority score for a structure
    static calculatePriority(structure) {
        const basePriority = this.STRUCTURE_PRIORITIES[structure.structureType] || 50;
        const hpPercent = structure.hits / structure.hitsMax;
        
        // Exponentially increase priority as HP gets lower
        const hpFactor = Math.pow(1 - hpPercent, 2);
        
        // Urgent repair needed if below 10% HP
        const urgencyBonus = hpPercent < 0.1 ? 50 : 0;
        
        // Calculate final priority score
        return basePriority * (1 + hpFactor) + urgencyBonus;
    }

    static execute(creep) {
        // Find all damaged structures
        const damagedStructures = creep.room.find(FIND_STRUCTURES, {
            filter: structure => structure.hits < structure.hitsMax
        });

        // Calculate priority scores and sort structures
        const prioritizedTargets = damagedStructures
            .map(structure => ({
                structure: structure,
                priority: this.calculatePriority(structure)
            }))
            .sort((a, b) => b.priority - a.priority);

        // Get the highest priority target
        const target = prioritizedTargets.length > 0 ? 
            prioritizedTargets[0].structure : null;

        if(target) {
            if(creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            // Optionally visualize repair priority
            creep.room.visual.text(
                `${Math.round(prioritizedTargets[0].priority)}`,
                target.pos.x,
                target.pos.y,
                {color: 'green', font: 0.5}
            );
        } else {
            // If no structures need repair, act as a backup builder
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