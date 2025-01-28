class ExecuteStore {
    static execute(creep) {
        // First priority: Nearby containers, prioritizing closest only
        const nearbyContainers = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_CONTAINER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(nearbyContainers.length > 0) {
            // Simply get the closest container
            const closestContainer = creep.pos.findClosestByRange(nearbyContainers);
            
            if(creep.transfer(closestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestContainer, {
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

        // Third priority: Spawns and Extensions, prioritizing closest
        const spawnTargets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        // Find the closest spawn/extension with capacity
        if(spawnTargets.length > 0) {
            const closestSpawn = creep.pos.findClosestByPath(spawnTargets);
            if(closestSpawn) {
                if(creep.transfer(closestSpawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestSpawn, {
                        visualizePathStyle: {stroke: '#ffffff'}
                    });
                }
                return;
            }
        }

        // Fourth priority: Towers with less than 50% energy
        const towers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_TOWER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > structure.store.getCapacity(RESOURCE_ENERGY) * 0.5;
            }
        });

        if(towers.length > 0) {
            const closestTower = creep.pos.findClosestByPath(towers);
            if(closestTower) {
                if(creep.transfer(closestTower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestTower, {
                        visualizePathStyle: {stroke: '#ffffff'}
                    });
                }
                return;
            }
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