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

        // Third priority: Storage if available
        const storage = creep.room.storage;
        if(storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if(creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Fourth priority: Containers not near sources
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType !== STRUCTURE_CONTAINER) return false;
                const nearSource = creep.room.find(FIND_SOURCES).some(source => 
                    structure.pos.getRangeTo(source) <= 2
                );
                return !nearSource && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(containers.length > 0) {
            const closestContainer = creep.pos.findClosestByPath(containers);
            if(creep.transfer(closestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestContainer, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        }
    }
}

module.exports = ExecuteDeliver;