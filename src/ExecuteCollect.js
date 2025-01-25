class ExecuteCollect {
    static execute(creep) {
        // First try to collect excess energy from spawns (above 70% capacity)
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (spawn) => {
                const safetyThreshold = spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7;
                return spawn.store.getUsedCapacity(RESOURCE_ENERGY) > safetyThreshold;
            }
        });
    
        if (spawn) {
            const withdrawAmount = Math.min(
                creep.store.getFreeCapacity(RESOURCE_ENERGY),
                spawn.store.getUsedCapacity(RESOURCE_ENERGY) - 
                (spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7)
            );
    
            if (withdrawAmount > 0) {
                if (creep.withdraw(spawn, RESOURCE_ENERGY, withdrawAmount) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, {
                        visualizePathStyle: {stroke: '#ffaa00'}
                    });
                }
                return;
            }
        }
    
        // If no excess energy in spawns, harvest from sources
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
        }
    }
}

module.exports = ExecuteCollect;