class ExecutePickup {
    static execute(creep) {
        // First priority: Dropped resources
        const droppedResources = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });
        
        if(droppedResources) {
            if(creep.pickup(droppedResources) === ERR_NOT_IN_RANGE) {
                creep.moveTo(droppedResources, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Second priority: Containers near sources
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
                return structure.structureType === STRUCTURE_CONTAINER &&
                       structure.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity();
            }
        });
        
        if(containers.length > 0) {
            // Find container closest to a source
            const sourceContainers = containers.sort((a, b) => {
                const aDistance = Math.min(...creep.room.find(FIND_SOURCES).map(s => a.pos.getRangeTo(s)));
                const bDistance = Math.min(...creep.room.find(FIND_SOURCES).map(s => b.pos.getRangeTo(s)));
                return aDistance - bDistance;
            });
            
            if(creep.withdraw(sourceContainers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sourceContainers[0], {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }

        // Third priority: Tombstones with energy
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: tomb => tomb.store[RESOURCE_ENERGY] > 0
        });
        
        if(tombstone) {
            if(creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tombstone, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
            return;
        }
    }
}

module.exports = ExecutePickup;