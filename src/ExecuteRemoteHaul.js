class ExecuteRemoteHaul {
    static execute(creep) {
        const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });
        
        let target = droppedEnergy[0];
        
        if (!target) {
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                           s.store[RESOURCE_ENERGY] > 0
            });
            target = containers[0];
        }
        
        if (target) {
            if (target instanceof Resource) {
                if (creep.pickup(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
            } else {
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
            }
        }
    }
}

module.exports = ExecuteRemoteHaul;