// role.manager.js

const PRIORITY_TASKS = {
    HARVEST: 1,
    HAUL: 2,
    BUILD: 3,
    UPGRADE: 4,
    REPAIR: 5
};

module.exports = {
    // Main run function for creep task assignment
    run: function(creep) {
        // Reset working state if creep is empty/full
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if(creep.memory.working) {
            this.assignWork(creep);
        } else {
            this.gatherEnergy(creep);
        }
    },

    // Assign work based on priorities and creep capabilities
    assignWork: function(creep) {
        const room = creep.room;
        
        // Emergency repair for critical structures
        const criticalRepairs = room.find(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax * 0.3 && 
                        (s.structureType === STRUCTURE_CONTAINER ||
                         s.structureType === STRUCTURE_ROAD)
        });
        if(criticalRepairs.length > 0 && this.canDoTask(creep, 'repair')) {
            if(creep.repair(criticalRepairs[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(criticalRepairs[0]);
            }
            return;
        }

        // Priority 1: Fill spawns/extensions if they're not full
        const needsEnergy = room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                         s.structureType === STRUCTURE_EXTENSION) &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if(needsEnergy.length > 0 && this.canDoTask(creep, 'transfer')) {
            if(creep.transfer(needsEnergy[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(needsEnergy[0]);
            }
            return;
        }

        // Priority 2: Construction sites if they exist
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if(constructionSites.length > 0 && this.canDoTask(creep, 'build')) {
            if(creep.build(constructionSites[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSites[0]);
            }
            return;
        }

        // Priority 3: Upgrade controller if nothing else to do
        if(this.canDoTask(creep, 'upgrade')) {
            if(creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller);
            }
            return;
        }
    },

    // Gather energy from sources or dropped resources
    gatherEnergy: function(creep) {
        // First check for dropped energy
        const droppedEnergy = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: resource => resource.resourceType === RESOURCE_ENERGY
        });
        
        if(droppedEnergy && this.canDoTask(creep, 'pickup')) {
            if(creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                creep.moveTo(droppedEnergy);
            }
            return;
        }

        // Then check containers
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > 0
        });
        
        if(containers.length > 0 && this.canDoTask(creep, 'withdraw')) {
            const container = creep.pos.findClosestByRange(containers);
            if(creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container);
            }
            return;
        }

        // Only harvest if we're a harvester or there's no other energy available
        if(creep.memory.role === 'harvester' && this.canDoTask(creep, 'harvest')) {
            const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
            if(source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    },

    // Check if creep can perform a specific task based on body parts
    canDoTask: function(creep, task) {
        switch(task) {
            case 'harvest':
                return creep.getActiveBodyparts(WORK) > 0;
            case 'build':
            case 'upgrade':
            case 'repair':
                return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
            case 'transfer':
            case 'withdraw':
            case 'pickup':
                return creep.getActiveBodyparts(CARRY) > 0;
            default:
                return false;
        }
    }
};