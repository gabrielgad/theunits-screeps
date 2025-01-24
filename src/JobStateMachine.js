const StateMachine = require('StateMachine');

/**
 * JobStateMachine manages creep behavior and work assignments in a room.
 * This implementation focuses on performance by minimizing state transitions
 * and optimizing resource utilization checks.
 */
class JobStateMachine extends StateMachine {
    constructor(room) {
        super('Job_' + room.name);
        this.room = room;
        
        // Simplified state system for better performance
        this.states = {
            RUNNING: 'RUNNING',      // Normal operation state
            EMERGENCY: 'EMERGENCY'    // Handle critical situations (low energy, attacks)
        };

        // Individual creep working states
        this.workStates = {
            HARVEST: 'HARVEST',      // Gathering energy directly from source
            STORE: 'STORE',          // Delivering energy to structures
            BUILD: 'BUILD',          // Constructing structures
            COLLECT: 'COLLECT',      // Getting energy from containers/storage
            UPGRADE: 'UPGRADE'       // Upgrading room controller
        };

        // Initialize memory structure
        this.memory[this.name] = this.memory[this.name] || {};
        this.memory[this.name].pendingInit = new Set();
        this.memory[this.name].lastCleanup = Game.time;

        this.setState(this.states.RUNNING);
    }

    run() {
        // Periodic memory cleanup (every 100 ticks)
        if (Game.time % 100 === 0) {
            this.clearDeadCreepMemory();
        }

        // Check for emergency conditions
        this.checkEmergencyConditions();

        // Main execution based on current state
        if (this.getState() === this.states.EMERGENCY) {
            this.handleEmergency();
        } else {
            this.executeJobs();
        }
    }

    checkEmergencyConditions() {
        // Check for critical energy levels or hostile presence
        const energyRatio = this.room.energyAvailable / this.room.energyCapacityAvailable;
        const hostiles = this.room.find(FIND_HOSTILE_CREEPS);

        if (energyRatio < 0.2 || hostiles.length > 0) {
            this.setState(this.states.EMERGENCY);
        } else if (this.getState() === this.states.EMERGENCY && energyRatio > 0.5 && hostiles.length === 0) {
            this.setState(this.states.RUNNING);
        }
    }

    handleEmergency() {
        // Prioritize energy collection and defense in emergency
        const roomCreeps = this.room.find(FIND_MY_CREEPS);
        
        for (const creep of roomCreeps) {
            if (creep.memory.role === 'harvester') {
                // Harvesters focus on filling spawns and extensions
                this.executeEmergencyHarvester(creep);
            } else {
                // Other creeps help with energy collection
                this.executeEmergencySupport(creep);
            }
        }
    }

    executeEmergencyHarvester(creep) {
        if (creep.store.getFreeCapacity() > 0) {
            this.executeHarvest(creep);
        } else {
            // Prioritize filling spawn and extensions
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_EXTENSION) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: {stroke: '#ffffff'}
                    });
                }
            }
        }
    }

    executeEmergencySupport(creep) {
        if (creep.store.getFreeCapacity() > 0) {
            // Find closest available energy source
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy);
                }
                return;
            }

            const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                }
            }
        } else {
            // Help fill critical structures
            this.executeStore(creep);
        }
    }

    clearDeadCreepMemory() {
        for (let name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        this.memory[this.name].lastCleanup = Game.time;
    }

    executeJobs() {
        // Execute jobs for all creeps in a single pass
        const roomCreeps = this.room.find(FIND_MY_CREEPS);
        
        for (const creep of roomCreeps) {
            // Initialize new creeps if needed
            if (!creep.memory.workState) {
                this.initializeCreepState(creep);
            }

            // Update and execute creep state
            this.updateCreepState(creep);
            this.executeCreepState(creep);
        }
    }

    initializeCreepState(creep) {
        if (creep.memory.role === 'harvester') {
            creep.memory.workState = this.workStates.HARVEST;
        } else {
            creep.memory.workState = this.workStates.COLLECT;
        }
        creep.memory.working = true;
    }

    updateCreepState(creep) {
        // Handle state transitions based on creep's energy capacity
        if (creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = false;
            this.switchToStoringState(creep);
        }
        if (!creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = true;
            this.switchToCollectingState(creep);
        }
    }

    switchToStoringState(creep) {
        // Determine appropriate work state based on creep's role
        switch (creep.memory.role) {
            case 'harvester':
                creep.memory.workState = this.workStates.STORE;
                break;
            case 'builder':
                creep.memory.workState = this.workStates.BUILD;
                break;
            case 'upgrader':
                creep.memory.workState = this.workStates.UPGRADE;
                break;
            default:
                creep.memory.workState = this.workStates.STORE;
        }
    }

    switchToCollectingState(creep) {
        // Set collection state based on role and room conditions
        if (creep.memory.role === 'harvester') {
            creep.memory.workState = this.workStates.HARVEST;
        } else {
            creep.memory.workState = this.workStates.COLLECT;
        }
    }

    executeCreepState(creep) {
        // Execute appropriate behavior based on creep's current state
        switch (creep.memory.workState) {
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
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
        }
    }

    executeStore(creep) {
        // Prioritized structure filling implementation
        const target = this.findEnergyStorage(creep);
        
        if (target) {
            const actionResult = target.structure === 'site' ? 
                creep.build(target.target) : 
                creep.transfer(target.target, RESOURCE_ENERGY);

            if (actionResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(target.target, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        } else {
            // Default to controller upgrade if no other targets
            this.executeUpgrade(creep);
        }
    }

    findEnergyStorage(creep) {
        // Find critical structures first (spawns, extensions, towers)
        const criticalTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (criticalTarget) return { target: criticalTarget, structure: 'critical' };

        // Look for critical construction sites
        const criticalSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
            filter: (site) => {
                return site.structureType === STRUCTURE_EXTENSION ||
                       site.structureType === STRUCTURE_SPAWN ||
                       site.structureType === STRUCTURE_TOWER;
            }
        });
        if (criticalSite) return { target: criticalSite, structure: 'site' };

        return null;
    }

    executeCollect(creep) {
        // Try to collect from spawns with excess energy first
        const spawn = this.findSpawnWithExcessEnergy(creep);
        
        if (spawn) {
            const withdrawAmount = Math.min(
                creep.store.getFreeCapacity(RESOURCE_ENERGY),
                spawn.store.getUsedCapacity(RESOURCE_ENERGY) - 
                (spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7)
            );

            if (withdrawAmount > 0) {
                if (creep.withdraw(spawn, RESOURCE_ENERGY, withdrawAmount) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, {
                        visualizePathStyle: {stroke: '#ffaa00'}
                    });
                }
                return;
            }
        }

        // Fall back to source harvesting if no excess energy available
        this.executeHarvest(creep);
    }

    findSpawnWithExcessEnergy(creep) {
        return creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (spawn) => {
                const safetyThreshold = spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7;
                return spawn.store.getUsedCapacity(RESOURCE_ENERGY) > safetyThreshold;
            }
        });
    }

    executeBuild(creep) {
        // Find and build construction sites
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (constructionSite) {
            if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        } else {
            // Help upgrade controller if no construction sites
            this.executeUpgrade(creep);
        }
    }

    executeUpgrade(creep) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }

    // Utility function to calculate safe withdraw amounts
    calculateSafeWithdrawAmount(structure) {
        const currentEnergy = structure.store.getUsedCapacity(RESOURCE_ENERGY);
        const safetyThreshold = structure.store.getCapacity(RESOURCE_ENERGY) * 0.7;
        return Math.max(0, currentEnergy - safetyThreshold);
    }
}

module.exports = JobStateMachine;