// src/role.builder.js
module.exports = {
    run: function(creep) {
        if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.building = false;
        }
        if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
            creep.memory.building = true;
        }

        if(creep.memory.building) {
            let targets = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => {
                    // Prioritize extensions and containers
                    return site.structureType == STRUCTURE_EXTENSION ||
                           site.structureType == STRUCTURE_CONTAINER ||
                           site.structureType == STRUCTURE_ROAD;
                }
            });
            
            if(targets.length > 0) {
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
        else {
            // Find closest container or source
            let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => s.structureType == STRUCTURE_CONTAINER &&
                             s.store[RESOURCE_ENERGY] > 0
            });
            
            if(container) {
                if(creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                // If no containers, harvest directly
                let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        }
    }
};