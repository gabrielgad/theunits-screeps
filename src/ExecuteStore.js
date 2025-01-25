class ExecuteStore {
    static execute(creep) {
        // First priority: Critical structures that need energy
        const criticalTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
    
        if(criticalTarget) {
            if(creep.transfer(criticalTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(criticalTarget, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Second priority: Nearby storage
        const nearbyStorage = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_CONTAINER ||
                        structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(nearbyStorage.length > 0) {
            const bestStorage = nearbyStorage.reduce((best, current) => 
                current.store.getFreeCapacity(RESOURCE_ENERGY) > best.store.getFreeCapacity(RESOURCE_ENERGY) 
                    ? current 
                    : best
            );
            
            if(creep.transfer(bestStorage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(bestStorage, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Third priority: Construction sites
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if(constructionSite) {
            if(creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Fourth priority: Spawns needing energy
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (spawn) => spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if(spawn) {
            if(creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, {
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