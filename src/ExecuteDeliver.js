class ExecuteDeliver {
    static execute(creep) {
        // First priority: Spawns and Extensions that need energy
        const spawnTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                return (structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        
        if(spawnTarget) {
            if(creep.transfer(spawnTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawnTarget, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Second priority: Towers below 80% capacity
        const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                return structure.structureType === STRUCTURE_TOWER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > structure.store.getCapacity(RESOURCE_ENERGY) * 0.2;
            }
        });
        
        if(tower) {
            if(creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tower, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Third priority: Containers near controller
        const controller = creep.room.controller;
        const controllerContainers = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType !== STRUCTURE_CONTAINER) return false;
                return structure.pos.getRangeTo(controller) <= 3 && 
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(controllerContainers.length > 0) {
            const closestControllerContainer = creep.pos.findClosestByPath(controllerContainers);
            if(creep.transfer(closestControllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestControllerContainer, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Fourth priority: Other containers not near sources
        const otherContainers = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType !== STRUCTURE_CONTAINER) return false;
                const nearSource = creep.room.find(FIND_SOURCES).some(source =>
                    structure.pos.getRangeTo(source) <= 2
                );
                const nearController = structure.pos.getRangeTo(controller) <= 3;
                return !nearSource && !nearController && 
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        
        if(otherContainers.length > 0) {
            const closestContainer = creep.pos.findClosestByPath(otherContainers);
            if(creep.transfer(closestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestContainer, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Final priority: Storage if available
        const storage = creep.room.storage;
        if(storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if(creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }
    }
}

module.exports = ExecuteDeliver;