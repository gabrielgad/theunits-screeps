class ExecuteRemoteDeliver {
    static execute(creep) {
        // First try to find the storage
        let target = creep.room.storage;
        
        // If no storage, look for spawn or extensions
        if (!target) {
            target = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_EXTENSION) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            })[0];
        }
        
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        }
    }
}

module.exports = ExecuteRemoteDeliver;