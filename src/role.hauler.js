// src/role.hauler.js
module.exports = {
    run: function(creep) {
        if(creep.store.getFreeCapacity() > 0) {
            // Find energy sources in priority order
            let target = null;
            
            // First priority: Dropped energy near sources
            const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: resource => {
                    if(resource.resourceType !== RESOURCE_ENERGY) return false;
                    // Check if it's near a source
                    const nearbySource = resource.pos.findInRange(FIND_SOURCES, 2);
                    return nearbySource.length > 0;
                }
            });
            
            if(droppedEnergy.length > 0) {
                // Find the dropped energy with the most resources
                target = droppedEnergy.reduce((best, current) => 
                    current.amount > best.amount ? current : best
                );
            }
            
            // Second priority: Containers near sources that are more than 50% full
            if(!target) {
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => {
                        if(s.structureType !== STRUCTURE_CONTAINER) return false;
                        if(s.store[RESOURCE_ENERGY] < creep.store.getFreeCapacity()) return false;
                        // Check if it's near a source
                        const nearbySource = s.pos.findInRange(FIND_SOURCES, 2);
                        return nearbySource.length > 0 && 
                               s.store[RESOURCE_ENERGY] > s.store.getCapacity(RESOURCE_ENERGY) * 0.5;
                    }
                });
                
                if(containers.length > 0) {
                    target = creep.pos.findClosestByPath(containers);
                }
            }
            
            // Third priority: Any dropped energy
            if(!target) {
                target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: resource => resource.resourceType === RESOURCE_ENERGY
                });
            }
            
            // Fourth priority: Any container with sufficient energy
            if(!target) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER &&
                               s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity() * 0.5
                });
            }
            
            if(target) {
                if(target instanceof Resource) {
                    if(creep.pickup(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                } else {
                    if(creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        } else {
            // Delivery priorities
            let target = null;
            
            // First priority: Spawns and extensions that aren't full
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            
            // Second priority: Towers below 75% capacity
            if(!target) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_TOWER &&
                               structure.store.getFreeCapacity(RESOURCE_ENERGY) > 
                               structure.store.getCapacity(RESOURCE_ENERGY) * 0.25;
                    }
                });
            }
            
            if(target) {
                if(creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};