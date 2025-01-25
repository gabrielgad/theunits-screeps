class ExecuteStore {
    static execute(creep) {
        // First priority: Nearby containers
        const nearbyContainers = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_CONTAINER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(nearbyContainers.length > 0) {
            const bestContainer = nearbyContainers.reduce((best, current) => 
                current.store.getFreeCapacity(RESOURCE_ENERGY) > best.store.getFreeCapacity(RESOURCE_ENERGY) 
                    ? current 
                    : best
            );
            
            if(creep.transfer(bestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(bestContainer, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Second priority: Storage structures
        const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_STORAGE &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(storage) {
            if(creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Third priority: Spawns and Extensions
        const spawnTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
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

        // Fourth priority: Towers
        const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_TOWER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
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

        // Fifth priority: Construction sites
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if(constructionSite) {
            if(creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Final priority: Upgrade controller
        if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }
}

module.exports = ExecuteStore;