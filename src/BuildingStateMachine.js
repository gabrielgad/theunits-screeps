const StateMachine = require('StateMachine');

/**
 * BuildingStateMachine handles the planning and management of construction in a room.
 * This implementation focuses solely on structure placement and construction site management,
 * leaving creep-related concerns to the CreepStateMachine.
 */
class BuildingStateMachine extends StateMachine {
    constructor(room) {
        super('Building_' + room.name);
        this.room = room;
        
        // Simplified states focused on construction planning
        this.states = {
            NORMAL: 'NORMAL',     // Normal planning operations
            CRITICAL: 'CRITICAL', // Low energy state - restrict planning
            IDLE: 'IDLE'         // No construction needs
        };
        
        // Initialize memory structures
        this.memory[this.name] = this.memory[this.name] || {};
        this.memory[this.name].buildQueue = this.memory[this.name].buildQueue || [];
        this.memory[this.name].energyNodes = {
            sources: [],
            containers: [],
            criticalStructures: []
        };
        
        this.setState(this.states.NORMAL);
    }

    /**
     * Defines structure limits based on room controller level
     * and room requirements
     */
    get structureLimits() {
        const rcl = this.room.controller.level;
        return {
            [STRUCTURE_EXTENSION]: CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] || 0,
            [STRUCTURE_ROAD]: Math.min(10, rcl * 2), // Scale roads with RCL
            [STRUCTURE_CONTAINER]: this.room.find(FIND_SOURCES).length,
            [STRUCTURE_STORAGE]: rcl >= 4 ? 1 : 0
        };
    }

    /**
     * Main loop that handles construction planning and site management
     * in a single efficient operation
     */
    run() {
        // Check room energy status to determine planning restrictions
        const energyRatio = this.room.energyAvailable / this.room.energyCapacityAvailable;
        this.updateEnergyNodes();

        // Update state based on energy conditions
        if (energyRatio < 0.2) {
            this.setState(this.states.CRITICAL);
            this.handleCriticalState();
        } else {
            // Check if we have any construction needs
            const constructionNeeded = this.checkConstructionNeeds();
            if (constructionNeeded) {
                this.setState(this.states.NORMAL);
                this.handleNormalState();
            } else {
                this.setState(this.states.IDLE);
            }
        }
    }

    /**
     * Checks if the room needs any construction work
     */
    checkConstructionNeeds() {
        // Check each structure type against its limit
        for (const [structureType, limit] of Object.entries(this.structureLimits)) {
            if (this.getTotalStructureCount(structureType) < limit) {
                return true;
            }
        }

        // Check for sources without containers
        const sources = this.memory[this.name].energyNodes.sources;
        if (sources.some(source => !source.hasContainer)) {
            return true;
        }

        return false;
    }

    /**
     * Updates tracking of energy-related structures
     */
    updateEnergyNodes() {
        const sources = this.room.find(FIND_SOURCES);
        this.memory[this.name].energyNodes.sources = sources.map(source => ({
            id: source.id,
            pos: source.pos,
            hasContainer: this.hasNearbyContainer(source.pos)
        }));
    }

    /**
     * Handles normal state operations for construction planning
     */
    handleNormalState() {
        // First plan essential energy infrastructure
        this.processEnergyInfrastructure();
        
        // Then plan other needed structures
        this.processStructureNeeds();
        
        // Finally, queue up construction sites
        this.processBuildQueue();
    }

    /**
     * Handles critical energy state by restricting construction planning
     */
    handleCriticalState() {
        // During energy crisis, only plan essential infrastructure
        this.memory[this.name].buildQueue = this.memory[this.name].buildQueue.filter(task => 
            task.isEnergyInfrastructure || task.type === STRUCTURE_EXTENSION
        );
    }

    /**
     * Plans energy infrastructure placement
     */
    processEnergyInfrastructure() {
        const sources = this.memory[this.name].energyNodes.sources;
        for (const source of sources) {
            if (!source.hasContainer) {
                this.addToBuildQueue({
                    type: STRUCTURE_CONTAINER,
                    priority: 1,
                    targetPos: source.pos,
                    isEnergyInfrastructure: true
                });
            }
        }
    }

    /**
     * Plans structure placement based on room needs and priorities
     */
    processStructureNeeds() {
        const priorities = [
            {
                type: STRUCTURE_EXTENSION,
                priority: 1,
                condition: () => this.needsMoreStructures(STRUCTURE_EXTENSION)
            },
            {
                type: STRUCTURE_CONTAINER,
                priority: 2,
                condition: () => this.needsMoreStructures(STRUCTURE_CONTAINER)
            },
            {
                type: STRUCTURE_ROAD,
                priority: 3,
                condition: () => this.needsMoreStructures(STRUCTURE_ROAD) && this.room.controller.level >= 2
            },
            {
                type: STRUCTURE_STORAGE,
                priority: 4,
                condition: () => this.needsMoreStructures(STRUCTURE_STORAGE) && this.room.controller.level >= 4
            }
        ];

        for (const structureType of priorities) {
            if (structureType.condition()) {
                this.addToBuildQueue({
                    type: structureType.type,
                    priority: structureType.priority
                });
            }
        }
    }

    /**
     * Checks if more structures of a given type are needed
     */
    needsMoreStructures(structureType) {
        const totalCount = this.getTotalStructureCount(structureType);
        const limit = this.structureLimits[structureType];
        return totalCount < limit;
    }

    /**
     * Gets total count of structures, including construction sites
     */
    getTotalStructureCount(structureType) {
        const existingStructures = this.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === structureType
        }).length;

        const constructionSites = this.room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: s => s.structureType === structureType
        }).length;

        return existingStructures + constructionSites;
    }

    /**
     * Manages the construction queue and site placement
     */
    processBuildQueue() {
        const queue = this.memory[this.name].buildQueue;
        const maxSites = CONTROLLER_STRUCTURES[STRUCTURE_CONTAINER][this.room.controller.level];
        const currentSites = this.room.find(FIND_MY_CONSTRUCTION_SITES).length;
        
        while (queue.length > 0 && currentSites < maxSites) {
            const task = queue[0];
            const position = task.targetPos ? 
                new RoomPosition(task.targetPos.x, task.targetPos.y, this.room.name) :
                this.findBuildPosition(task.type);
            
            if (position && this.canBuildStructureAt(position)) {
                const result = this.room.createConstructionSite(position.x, position.y, task.type);
                if (result === OK) {
                    queue.shift();
                } else if (result === ERR_FULL) {
                    break;
                } else {
                    queue.shift();
                }
            } else {
                queue.shift();
            }
        }
    }

    /**
     * Finds appropriate build position based on structure type
     */
    findBuildPosition(structureType) {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return null;

        switch(structureType) {
            case STRUCTURE_EXTENSION:
                return this.findExtensionPosition(spawn.pos);
            case STRUCTURE_ROAD:
                return this.findRoadPosition(spawn);
            case STRUCTURE_CONTAINER:
                return this.findContainerPosition();
            case STRUCTURE_STORAGE:
                return this.findStoragePosition(spawn.pos);
            default:
                return null;
        }
    }

    /**
     * Position finding utility methods
     * These methods remain unchanged as they handle pure positioning logic
     * and don't involve creep management
     */

    findExtensionPosition(spawnPos) {
        // Implementation remains the same
    }

    findRoadPosition(spawn) {
        // Implementation remains the same
    }

    findContainerPosition() {
        // Implementation remains the same
    }

    findStoragePosition(spawnPos) {
        // Implementation remains the same
    }

    /**
     * Utility methods for checking build validity
     */
    canBuildStructureAt(pos) {
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        return structures.length === 0 && 
               sites.length === 0 && 
               pos.lookFor(LOOK_TERRAIN)[0] !== 'wall';
    }

    hasNearbyContainer(pos) {
        const containers = pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        return containers.length > 0;
    }
}

module.exports = BuildingStateMachine;