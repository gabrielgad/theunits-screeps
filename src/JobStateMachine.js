const StateMachine = require('StateMachine');

class JobStateMachine extends StateMachine {
    constructor(room) {
        super('Job_' + room.name);
        this.room = room;
        
        // Since we're combining analysis and execution, we only need workStates now
        this.workStates = {
            HARVEST: 'HARVEST',    // Gathering energy from source
            STORE: 'STORE',        // Delivering energy to structures
            BUILD: 'BUILD',        // Constructing structures
            COLLECT: 'COLLECT',    // Getting energy for work
            UPGRADE: 'UPGRADE'     // Upgrading room controller
        };
    }

    run() {
        // Combined analysis and execution in a single tick
        this.clearDeadCreepMemory();
        this.processAllCreeps();
    }

    clearDeadCreepMemory() {
        for(let name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }

    processAllCreeps() {
        for(let name in Game.creeps) {
            const creep = Game.creeps[name];
            if(creep.room.name !== this.room.name) continue;
            
            // Initialize new creeps if needed (analysis phase)
            if(!creep.memory.workState) {
                this.initializeCreepState(creep);
            }
            
            // Update and execute creep behavior (execution phase)
            this.updateCreepState(creep);
            this.executeCreepState(creep);
        }
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
        if(creep.memory.role === 'harvester') {
            creep.memory.workState = this.workStates.HARVEST;
        } else {
            creep.memory.workState = this.workStates.COLLECT;
        }
    }

    executeCreepState(creep) {
        // Execute behavior based on the creep's current work state
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
        // Find and harvest from the closest active energy source
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
        // First priority: Critical structures that need energy to keep the colony running
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

        // Second priority: Store in nearby containers/storage
        const nearbyStorage = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_CONTAINER ||
                        structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if(nearbyStorage.length > 0) {
            // Find the storage structure with the most free capacity
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

        // Third priority: Help with construction if there are active sites
        const constructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if(constructionSite) {
            if(creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
            return;
        }

        // Fourth priority: Check if spawns need additional energy beyond critical levels
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
    
        // Final priority: If nothing else needs energy, upgrade the controller
        if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }

    executeCollect(creep) {
        // First try to collect excess energy from spawns (above 70% capacity)
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (spawn) => {
                const safetyThreshold = spawn.store.getCapacity(RESOURCE_ENERGY) * 0.7;
                return spawn.store.getUsedCapacity(RESOURCE_ENERGY) > safetyThreshold;
            }
        });
    
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
    
        // If no excess energy in spawns, harvest from sources
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
        // First, let's get all construction sites in the room
        const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
        
        if(constructionSites.length > 0) {
            // Calculate a priority score for each construction site
            const prioritizedSites = constructionSites.map(site => {
                // Calculate progress percentage
                const progressPercent = site.progress / site.progressTotal;
                
                // Define base importance weights for different structure types
                const importanceWeights = {
                    // Energy infrastructure (critical)
                    [STRUCTURE_SPAWN]: 100,
                    [STRUCTURE_EXTENSION]: 90,
                    [STRUCTURE_STORAGE]: 85,
                    
                    // Defense infrastructure (high priority)
                    [STRUCTURE_TOWER]: 80,
                    [STRUCTURE_WALL]: 75,
                    [STRUCTURE_RAMPART]: 70,
                    
                    // Resource infrastructure (medium priority)
                    [STRUCTURE_CONTAINER]: 60,
                    [STRUCTURE_LINK]: 55,
                    
                    // Movement infrastructure (lower priority)
                    [STRUCTURE_ROAD]: 40,
                    
                    // Default weight for any unspecified structures
                    default: 30
                };
                
                const importanceWeight = importanceWeights[site.structureType] || importanceWeights.default;
                
                const score = (progressPercent * 0.6 * 100) + (importanceWeight * 0.4);
                
                return {
                    site: site,
                    score: score,
                    distance: creep.pos.getRangeTo(site)
                };
            });
            
            const bestSite = prioritizedSites.reduce((best, current) => {
                const bestAdjustedScore = best.score - (best.distance * 0.5);
                const currentAdjustedScore = current.score - (current.distance * 0.5);
                
                return currentAdjustedScore > bestAdjustedScore ? current : best;
            });
            
            const buildResult = creep.build(bestSite.site);
            if(buildResult === ERR_NOT_IN_RANGE) {
                const colorIntensity = Math.min(255, Math.floor(bestSite.score * 2.55));
                const pathColor = `#${colorIntensity.toString(16).padStart(2, '0')}${colorIntensity.toString(16).padStart(2, '0')}ff`;
                
                creep.moveTo(bestSite.site, {
                    visualizePathStyle: {stroke: pathColor}
                });
            }
        } else {
            // If no construction sites exist, help upgrade the controller
            this.executeUpgrade(creep);
        }
    }

    executeUpgrade(creep) {
        // Upgrade the room controller
        if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        }
    }
}

module.exports = JobStateMachine;