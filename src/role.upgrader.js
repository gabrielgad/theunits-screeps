// src/role.upgrader.js
module.exports = {
    run: function(creep) {
        // State management
        if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
            // Clear target source when empty
            creep.memory.targetSource = null;
        }
        if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
        }

        if(creep.memory.upgrading) {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else {
            // First check for dropped energy near sources
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: resource => {
                    if(resource.resourceType !== RESOURCE_ENERGY) return false;
                    // Only pick up if it's a significant amount
                    if(resource.amount < 50) return false;
                    return true;
                }
            });

            if(droppedEnergy) {
                if(creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }

            // If no target source is saved, find the best one
            if(!creep.memory.targetSource) {
                const sources = creep.room.find(FIND_SOURCES);
                if(sources.length > 0) {
                    // Find source with most energy and fewest creeps around it
                    let bestSource = null;
                    let bestScore = -1;
                    
                    sources.forEach(source => {
                        if(source.energy === 0) return;
                        
                        const creepsNearby = source.pos.findInRange(FIND_MY_CREEPS, 2).length;
                        const score = source.energy - (creepsNearby * 100); // Penalize crowded sources
                        
                        if(score > bestScore) {
                            bestScore = score;
                            bestSource = source;
                        }
                    });
                    
                    if(bestSource) {
                        creep.memory.targetSource = bestSource.id;
                    }
                }
            }

            // Use the target source
            if(creep.memory.targetSource) {
                const source = Game.getObjectById(creep.memory.targetSource);
                if(source && source.energy > 0) {
                    if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                } else {
                    // Clear target if source is empty
                    creep.memory.targetSource = null;
                }
            }
        }
    }
};