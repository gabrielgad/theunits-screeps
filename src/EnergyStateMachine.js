// EnergyStateMachine.js
const StateMachine = require('StateMachine');

class EnergyStateMachine extends StateMachine {
    constructor(room) {
        super('Energy_' + room.name);
        this.room = room;
        
        this.states = {
            ANALYZE: 'ANALYZE',           // Evaluate energy infrastructure
            DISTRIBUTE: 'DISTRIBUTE',      // Manage energy priorities
            OPTIMIZE: 'OPTIMIZE',          // Plan infrastructure improvements
            CRITICAL: 'CRITICAL'          // Handle energy shortages
        };

        // Initialize energy infrastructure memory
        this.memory[this.name].energyNodes = this.memory[this.name].energyNodes || {
            sources: [],           // Known energy source locations
            containers: [],        // Container positions
            links: [],            // Link network layout
            priorities: []         // Priority structure locations
        };
        
        this.setState(this.states.ANALYZE);
    }

    run() {
        switch(this.getState()) {
            case this.states.ANALYZE:
                this.runAnalyzeState();
                break;
            case this.states.DISTRIBUTE:
                this.runDistributeState();
                break;
            case this.states.OPTIMIZE:
                this.runOptimizeState();
                break;
            case this.states.CRITICAL:
                this.runCriticalState();
                break;
        }
    }

    runAnalyzeState() {
        // Calculate current energy metrics
        const energyAvailable = this.room.energyAvailable;
        const energyCapacity = this.room.energyCapacityAvailable;
        const energyRatio = energyAvailable / energyCapacity;

        // Update energy source information
        this.updateSourceInformation();

        // Check energy status and transition accordingly
        if (energyRatio < 0.2) {
            this.setState(this.states.CRITICAL);
        } else if (this.shouldOptimize()) {
            this.setState(this.states.OPTIMIZE);
        } else {
            this.setState(this.states.DISTRIBUTE);
        }
    }

    runDistributeState() {
        // Set energy distribution priorities
        const priorities = this.calculateEnergyPriorities();
        this.memory[this.name].energyPriorities = priorities;

        // Plan container and link layouts
        this.planEnergyInfrastructure();

        this.setState(this.states.ANALYZE);
    }

    runOptimizeState() {
        // Analyze energy flow efficiency
        const inefficientNodes = this.findInefficientNodes();
        
        // Plan infrastructure improvements
        this.planInfrastructureImprovements(inefficientNodes);

        this.setState(this.states.ANALYZE);
    }

    runCriticalState() {
        // Implement emergency energy protocols
        this.implementEmergencyProtocols();

        // Check if crisis is resolved
        if (this.room.energyAvailable / this.room.energyCapacityAvailable > 0.3) {
            this.setState(this.states.ANALYZE);
        }
    }

    updateSourceInformation() {
        // Map all energy sources and their surrounding terrain
        const sources = this.room.find(FIND_SOURCES);
        const sourceInfo = sources.map(source => ({
            id: source.id,
            pos: source.pos,
            accessPoints: this.calculateAccessPoints(source.pos),
            currentContainer: this.findNearbyContainer(source.pos)
        }));

        this.memory[this.name].energyNodes.sources = sourceInfo;
    }

    calculateAccessPoints(pos) {
        // Calculate available positions around an energy source
        const terrain = this.room.lookForAtArea(LOOK_TERRAIN,
            pos.y - 1, pos.x - 1,
            pos.y + 1, pos.x + 1, true);
        
        return terrain.filter(t => t.terrain !== 'wall').length;
    }

    findNearbyContainer(pos) {
        // Look for containers near a position
        const containers = pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        
        return containers.length > 0 ? containers[0].id : null;
    }

    calculateEnergyPriorities() {
        // Determine energy distribution priorities based on room needs
        const priorities = [];
        
        // Essential structures always get priority
        const spawns = this.room.find(FIND_MY_SPAWNS);
        const extensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        });
        
        // Add priorities in order
        priorities.push(
            ...spawns.map(s => ({id: s.id, type: 'spawn', priority: 1})),
            ...extensions.map(e => ({id: e.id, type: 'extension', priority: 2}))
        );

        return priorities;
    }

    planEnergyInfrastructure() {
        // Plan optimal container and link placement
        const sources = this.memory[this.name].energyNodes.sources;
        
        for (const source of sources) {
            if (!source.currentContainer) {
                // Plan container placement
                const containerPos = this.findOptimalContainerPosition(source);
                if (containerPos) {
                    this.memory[this.name].constructionNeeds = 
                        this.memory[this.name].constructionNeeds || [];
                    this.memory[this.name].constructionNeeds.push({
                        type: STRUCTURE_CONTAINER,
                        pos: containerPos,
                        priority: 'high'
                    });
                }
            }
        }
    }

    findOptimalContainerPosition(source) {
        // Find the best position for a container near a source
        const pos = source.pos;
        const area = this.room.lookForAtArea(LOOK_TERRAIN,
            pos.y - 1, pos.x - 1,
            pos.y + 1, pos.x + 1, true);
        
        // Find the position with the most access points
        const suitableArea = area.find(t => t.terrain !== 'wall');
        return suitableArea ? suitableArea.pos : null;
    }

    shouldOptimize() {
        // Determine if we should enter optimization state
        return Game.time % 100 === 0 || 
               this.room.energyAvailable === this.room.energyCapacityAvailable;
    }

    findInefficientNodes() {
        // Analyze energy infrastructure for inefficiencies
        return this.memory[this.name].energyNodes.sources.filter(source => {
            // Check if source has inefficient harvesting setup
            return !source.currentContainer || this.isPathInefficient(source);
        });
    }

    isPathInefficient(source) {
        // Check if paths to this source are optimal
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return false;

        const path = PathFinder.search(spawn.pos, {pos: source.pos, range: 1});
        return path.incomplete || path.cost > 50; // Arbitrary threshold
    }

    planInfrastructureImprovements(inefficientNodes) {
        // Plan improvements for inefficient energy infrastructure
        for (const node of inefficientNodes) {
            if (!node.currentContainer) {
                // Prioritize container construction
                const containerPos = this.findOptimalContainerPosition(node);
                if (containerPos) {
                    this.requestConstruction(STRUCTURE_CONTAINER, containerPos);
                }
            }
            
            // Plan road construction if needed
            if (this.room.controller.level >= 2) {
                this.planRoadToSource(node);
            }
        }
    }

    implementEmergencyProtocols() {
        // Set emergency energy distribution priorities
        this.memory[this.name].energyPriorities = [
            // Only essential structures during crisis
            ...this.room.find(FIND_MY_SPAWNS)
                .map(s => ({id: s.id, type: 'spawn', priority: 1}))
        ];
    }

    requestConstruction(structureType, pos) {
        // Request construction through room memory
        this.memory[this.name].constructionNeeds = 
            this.memory[this.name].constructionNeeds || [];
        
        this.memory[this.name].constructionNeeds.push({
            type: structureType,
            pos: pos,
            priority: structureType === STRUCTURE_CONTAINER ? 'high' : 'medium'
        });
    }

    planRoadToSource(source) {
        // Plan road construction from spawn to source
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        const path = PathFinder.search(spawn.pos, {pos: source.pos, range: 1}).path;
        for (const pos of path) {
            this.requestConstruction(STRUCTURE_ROAD, pos);
        }
    }
}

module.exports = EnergyStateMachine;