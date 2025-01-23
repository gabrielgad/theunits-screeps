module.exports = {
    run: function(creep) {
        if(creep.store.getFreeCapacity() > 0) {
            // Find dropped resources or containers to collect from
            let target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
            
            if(!target) {
                // Look for containers with significant energy
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType == STRUCTURE_CONTAINER &&
                               s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity()
                });
            }
            
            if(target) {
                if(target instanceof Resource) {
                    if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                } else {
                    if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        } else {
            // Prioritize spawns and extensions
            let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            
            if(!target) {
                // If no spawns/extensions need energy, fill towers
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType == STRUCTURE_TOWER &&
                               structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            }
            
            if(target) {
                if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};