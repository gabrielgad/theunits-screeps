// JobStateMachine.js
const StateMachine = require('StateMachine');

class JobStateMachine extends StateMachine {
    constructor(room) {
        super('Job_' + room.name);
        this.room = room;
        
        // These are the main states for job coordination
        this.states = {
            ANALYZE: 'ANALYZE',    // Evaluate room needs and creep jobs
            EXECUTE: 'EXECUTE'     // Run creep behaviors
        };

        // Individual creep working states
        this.workStates = {
            HARVEST: 'HARVEST',    // Gathering energy from source
            STORE: 'STORE',        // Delivering energy to structures
            BUILD: 'BUILD',        // Constructing structures
            COLLECT: 'COLLECT',    // Getting energy for work
            UPGRADE: 'UPGRADE'     // Upgrading room controller
        };

        this.setState(this.states.ANALYZE);
    }

    run() {
        // Clear memory of dead creeps
        this.clearDeadCreepMemory();

        switch(this.getState()) {
            case this.states.ANALYZE:
                this.runAnalyzeState();
                break;
            case this.states.EXECUTE:
                this.runExecuteState();
                break;
        }
    }

    clearDeadCreepMemory() {
        for(let name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }

    runAnalyzeState() {
        // Initialize any new creeps that don't have a workState
        for(let name in Game.creeps) {
            const creep = Game.creeps[name];
            if(creep.room.name !== this.room.name) continue;
            
            if(!creep.memory.workState) {
                this.initializeCreepState(creep);
            }
        }
        
        this.setState(this.states.EXECUTE);
    }

    initializeCreepState(creep) {
        // Set initial working state based on role
        if(creep.memory.role === 'harvester') {
            creep.memory.workState = this.workStates.HARVEST;
        } else {
            creep.memory.workState = this.workStates.COLLECT;
        }
        
        // Initialize working flag
        creep.memory.working = true;
    }

    runExecuteState() {
        // Execute jobs for all creeps in the room
        for(let name in Game.creeps) {
            const creep = Game.creeps[name];
            if(creep.room.name !== this.room.name) continue;
            
            // Check and update creep state based on energy capacity
            this.updateCreepState(creep);
            
            // Execute the appropriate behavior for current state
            this.executeCreepState(creep);
        }
        
        this.setState(this.states.ANALYZE);
    }

    updateCreepState(creep) {
        // Update creep's working state based on energy capacity
        if(creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            this.switchToStoringState(creep);
        }
        if(!creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = true;
            this.switchToCollectingState(creep);
        }
    }

    switchToStoringState(creep) {
        // Switch to appropriate storage/work state based on role
        switch(creep.memory.role) {
            case 'harvester':
                creep.memory.workState = this.workStates.STORE;
                break;
            case 'builder':
                creep.memory.workState = this.workStates.BUILD;
                break;
            case 'upgrader':
                creep.memory.workState = this.workStates.UPGRADE;
                break;
        }
    }

    switchToCollectingState(creep) {
        // Switch to appropriate collection state based on role
        if(creep.memory.role === 'harvester') {
            creep.memory.workState = this.workStates.HARVEST;
        } else {
            creep.memory.workState = this.workStates.COLLECT;
        }
    }

    executeCreepState(creep) {
        // Execute the appropriate behavior for the creep's current state
        switch(creep.memory.workState) {
            case this.workStates.HARVEST:
                this.executeHarvest(creep);
                break;
            case this.workStates.STORE:
                this.executeStore(creep);
                break;
            case this.workStates.COLLECT:
                this.executeCollect(creep);
                break;
            case this.workStates.BUILD:
                this.executeBuild(creep);
                break;
            case this.workStates.UPGRADE:
                this.executeUpgrade(creep);
                break;
        }
    }

    executeHarvest(creep) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if(source) {
            if(creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
        }
    }

    executeStore(creep) {
        // First, try to find critical structures that need energy
        const criticalTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                // Check if it's a spawn, extension, or tower that needs energy
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
    
        // If we found a critical structure, prioritize filling it
        if(criticalTarget) {
            if(creep.transfer(criticalTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(criticalTarget, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return; // Exit the method since we're handling critical structures
        }
    
        // If no critical structures need energy, use the controller as a fallback
        if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }

    executeCollect(creep) {
        // First, check if spawns have excess energy we can use
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (spawn) => {
                // Calculate what 70% of the spawn's capacity would be
                const safetyThreshold = spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7;
                // Only withdraw if spawn has more than 70% energy
                return spawn.store.getUsedCapacity(RESOURCE_ENERGY) > safetyThreshold;
            }
        });
    
        // If we found a spawn with excess energy, withdraw from it
        if (spawn) {
            const withdrawAmount = Math.min(
                // Don't take more than we can carry
                creep.store.getFreeCapacity(RESOURCE_ENERGY),
                // Don't take more than what's above the 70% threshold
                spawn.store.getUsedCapacity(RESOURCE_ENERGY) - 
                (spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7)
            );
    
            if (withdrawAmount > 0) {
                if (creep.withdraw(spawn, RESOURCE_ENERGY, withdrawAmount) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, {
                        visualizePathStyle: {stroke: '#ffaa00'}
                    });
                }
                return; // Exit if we're handling spawn collection
            }
        }
    
        // If no spawn has excess energy, fall back to harvesting from sources
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
        }
    }

    executeBuild(creep) {
        // Find construction sites
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if(constructionSite) {
            if(creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        } else {
            // If no construction sites, help upgrade controller
            this.executeUpgrade(creep);
        }
    }

    executeUpgrade(creep) {
        // Upgrade the controller
        if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }
}

module.exports = JobStateMachine;