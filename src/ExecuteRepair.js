class ExecuteRepair {
    static execute(creep) {
        // Find structures that need repair, excluding walls and ramparts
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                return structure.hits < structure.hitsMax && 
                       structure.structureType !== STRUCTURE_WALL && 
                       structure.structureType !== STRUCTURE_RAMPART;
            }
        });

        if(target) {
            if(creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
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