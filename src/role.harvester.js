// src/role.harvester.js
module.exports = {
    run: function(creep) {
        if(creep.store.getFreeCapacity() > 0) {
            // Find closest source with available energy
            let sources = creep.room.find(FIND_SOURCES);
            let target = creep.pos.findClosestByPath(sources, {
                filter: (source) => {
                    // Count how many other creeps are targeting this source
                    let numberOfHarvesters = _.filter(Game.creeps, (c) => 
                        c.memory.targetSource === source.id && 
                        c.memory.role === 'harvester'
                    ).length;
                    // Allow up to 3 harvesters per source
                    return numberOfHarvesters < 3;
                }
            });
            
            if(target) {
                creep.memory.targetSource = target.id;
                if(creep.harvest(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        }
        else {
            // Prioritize storage targets
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        (structure.structureType == STRUCTURE_EXTENSION ||
                         structure.structureType == STRUCTURE_SPAWN ||
                         structure.structureType == STRUCTURE_CONTAINER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    );
                }
            });
            
            // Sort targets by priority and distance
            targets.sort((a, b) => {
                let priorityOrder = {
                    'spawn': 1,
                    'extension': 2,
                    'container': 3
                };
                let aPriority = priorityOrder[a.structureType];
                let bPriority = priorityOrder[b.structureType];
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
            });

            if(targets.length > 0) {
                if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};