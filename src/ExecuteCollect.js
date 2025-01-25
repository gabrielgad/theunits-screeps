class ExecuteCollect {
    static execute(creep) {
        // First priority: Check nearby containers
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => 
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store[RESOURCE_ENERGY] > 0
        });

        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Second priority: Check storage
        const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => 
                structure.structureType === STRUCTURE_STORAGE &&
                structure.store[RESOURCE_ENERGY] > 0
        });

        if (storage) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Third priority: Check spawns with excess energy
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
    }
}

module.exports = ExecuteCollect;