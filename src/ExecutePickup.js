class ExecutePickup {
    static execute(creep) {
        // First priority: Storage
        const storage = creep.room.storage;
        if (storage && storage.store[RESOURCE_ENERGY] > 0 && creep.store.getFreeCapacity() > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // Second priority: Containers
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_CONTAINER &&
                   structure.store[RESOURCE_ENERGY] > 0  // Changed condition
        });
        
        if (containers.length > 0 && creep.store.getFreeCapacity() > 0) {
            const sourceContainers = containers.sort((a, b) => {
                const aDistance = Math.min(...creep.room.find(FIND_SOURCES).map(s => a.pos.getRangeTo(s)));
                const bDistance = Math.min(...creep.room.find(FIND_SOURCES).map(s => b.pos.getRangeTo(s)));
                return aDistance - bDistance;
            });
            
            if (creep.withdraw(sourceContainers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sourceContainers[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // Third priority: Dropped resources
        const droppedResources = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });
        
        if (droppedResources && creep.store.getFreeCapacity() > 0) {
            if (creep.pickup(droppedResources) === ERR_NOT_IN_RANGE) {
                creep.moveTo(droppedResources, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // Fourth priority: Tombstones
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: tomb => tomb.store[RESOURCE_ENERGY] > 0
        });
        
        if (tombstone && creep.store.getFreeCapacity() > 0) {
            if (creep.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(tombstone, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
}

module.exports = ExecutePickup;