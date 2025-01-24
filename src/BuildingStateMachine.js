// BuildingStateMachine.js
const StateMachine = require('StateMachine');

class BuildingStateMachine extends StateMachine {
    constructor(room) {
        super('Building_' + room.name);
        this.room = room;
        this.states = {
            ANALYZE: 'ANALYZE',
            BUILD_EXTENSIONS: 'BUILD_EXTENSIONS',
            BUILD_CONTAINERS: 'BUILD_CONTAINERS',
            BUILD_ROADS: 'BUILD_ROADS',
            IDLE: 'IDLE'
        };
        
        // Initialize building priorities and positions
        this.memory[this.name].buildingPlans = this.memory[this.name].buildingPlans || {
            extensionCount: 0,
            containerCount: 0,
            roadPositions: []
        };
        
        this.setState(this.states.ANALYZE);
    }

    run() {
        // Don't try to build if we're too low on energy
        if (this.room.energyAvailable < this.room.energyCapacityAvailable * 0.7) {
            return;
        }

        switch(this.getState()) {
            case this.states.ANALYZE:
                this.runAnalyzeState();
                break;
            case this.states.BUILD_EXTENSIONS:
                this.runBuildExtensionsState();
                break;
            case this.states.BUILD_CONTAINERS:
                this.runBuildContainersState();
                break;
            case this.states.BUILD_ROADS:
                this.runBuildRoadsState();
                break;
        }
    }

    runAnalyzeState() {
        // Check RCL (Room Controller Level) requirements
        const rcl = this.room.controller.level;
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl];
        const currentExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;

        // Prioritize extensions if we can build more
        if (currentExtensions < maxExtensions) {
            this.setState(this.states.BUILD_EXTENSIONS);
            return;
        }

        // Check if we need containers near sources
        const sources = this.room.find(FIND_SOURCES);
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });

        if (containers.length < sources.length) {
            this.setState(this.states.BUILD_CONTAINERS);
            return;
        }

        // Check if we need roads
        if (this.shouldBuildRoads()) {
            this.setState(this.states.BUILD_ROADS);
            return;
        }

        this.setState(this.states.IDLE);
    }

    runBuildExtensionsState() {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        // Find a valid position for a new extension
        const pos = this.findExtensionPosition(spawn.pos);
        if (pos) {
            this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
            this.memory[this.name].buildingPlans.extensionCount++;
        }

        this.setState(this.states.ANALYZE);
    }

    findExtensionPosition(spawnPos) {
        // Simple spiral pattern around spawn
        const checked = new Set();
        for (let radius = 2; radius < 6; radius++) {
            for (let x = -radius; x <= radius; x++) {
                for (let y = -radius; y <= radius; y++) {
                    if (Math.abs(x) + Math.abs(y) === radius) {
                        const newX = spawnPos.x + x;
                        const newY = spawnPos.y + y;
                        const posKey = `${newX},${newY}`;
                        
                        if (checked.has(posKey)) continue;
                        checked.add(posKey);

                        const pos = new RoomPosition(newX, newY, this.room.name);
                        if (this.canBuildStructureAt(pos)) {
                            return pos;
                        }
                    }
                }
            }
        }
        return null;
    }

    runBuildContainersState() {
        const sources = this.room.find(FIND_SOURCES);
        for (let source of sources) {
            // Find nearby positions
            const area = this.room.lookForAtArea(LOOK_TERRAIN,
                source.pos.y - 1, source.pos.x - 1,
                source.pos.y + 1, source.pos.x + 1, true);
            
            // Find a valid position for container
            for (let spot of area) {
                if (spot.terrain !== 'wall') {
                    const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                    if (this.canBuildStructureAt(pos)) {
                        this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                        this.memory[this.name].buildingPlans.containerCount++;
                        break;
                    }
                }
            }
        }
        
        this.setState(this.states.ANALYZE);
    }

    runBuildRoadsState() {
        // Build roads from spawn to sources and controller
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        const destinations = [
            ...this.room.find(FIND_SOURCES),
            this.room.controller
        ];

        for (let dest of destinations) {
            const path = spawn.pos.findPathTo(dest, {
                ignoreCreeps: true,
                swampCost: 2
            });

            for (let step of path) {
                const pos = new RoomPosition(step.x, step.y, this.room.name);
                if (this.canBuildStructureAt(pos)) {
                    this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
            }
        }

        this.setState(this.states.ANALYZE);
    }

    canBuildStructureAt(pos) {
        // Check if position is valid for construction
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        return structures.length === 0 && sites.length === 0 && 
               pos.lookFor(LOOK_TERRAIN)[0] !== 'wall';
    }

    shouldBuildRoads() {
        // Check if we need roads based on room level and existing infrastructure
        if (this.room.controller.level < 2) return false;
        
        const roads = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_ROAD }
        });

        return roads.length < 10; // Arbitrary threshold, adjust as needed
    }
}

module.exports = BuildingStateMachine;