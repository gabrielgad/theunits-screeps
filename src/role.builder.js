// src/role.builder.js
module.exports = {
    run: function(creep) {
        // State management
        if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.building = false;
            creep.memory.targetId = null;
        }
        if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
            creep.memory.building = true;
            creep.memory.targetId = null;
        }

        if(creep.memory.building) {
            // Try to complete existing target first
            if(creep.memory.targetId) {
                const target = Game.getObjectById(creep.memory.targetId);
                if(target) {
                    if(creep.build(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
            }

            // Find new construction target
            let target = this.findConstructionTarget(creep);
            
            if(target) {
                creep.memory.targetId = target.id;
                if(creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // No construction sites, act as upgrader
                if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
        else {
            // Get energy
            this.getEnergy(creep);
        }
    },

    findConstructionTarget: function(creep) {
        // Prioritize extensions and spawns
        let target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
            filter: site => site.structureType == STRUCTURE_EXTENSION ||
                           site.structureType == STRUCTURE_SPAWN
        });

        // Then towers
        if(!target) {
            target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: site => site.structureType == STRUCTURE_TOWER
            });
        }

        // Then storage
        if(!target) {
            target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: site => site.structureType == STRUCTURE_STORAGE
            });
        }

        // Then anything else
        if(!target) {
            target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        }

        return target;
    },

    getEnergy: function(creep) {
        // First try to get from containers or storage
        let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => (s.structureType == STRUCTURE_CONTAINER ||
                         s.structureType == STRUCTURE_STORAGE) &&
                         s.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity()
        });

        if(container) {
            if(creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // Then try to pick up dropped energy
        let droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType == RESOURCE_ENERGY &&
                              resource.amount >= creep.store.getFreeCapacity()
        });

        if(droppedEnergy) {
            if(creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // Finally, harvest from source
        let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if(source) {
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
};