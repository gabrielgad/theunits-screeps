const StateMachine = require('StateMachine');

class BuildingStateMachine extends StateMachine {
    constructor(room) {
        super('Building_' + room.name);
        this.room = room;
        
        // Initialize building plans in memory if they don't exist
        this.memory[this.name].buildingPlans = this.memory[this.name].buildingPlans || {
            extensionCount: 0,
            containerCount: 0,
            roadPositions: []
        };
    }

    run() {
        // Don't build if energy levels are too low
        if (this.room.energyAvailable < this.room.energyCapacityAvailable * 0.7) {
            return;
        }

        // Process all construction needs in priority order
        this.processBuildingNeeds();
    }

    processBuildingNeeds() {
        const rcl = this.room.controller.level;
        let constructionSitesPlaced = 0;
        const MAX_SITES_PER_TICK = 5; // Limit construction sites per tick

        // First Priority: Extensions
        if (this.needsExtensions(rcl)) {
            const extensionPos = this.findExtensionPosition(this.room.find(FIND_MY_SPAWNS)[0].pos);
            if (extensionPos && constructionSitesPlaced < MAX_SITES_PER_TICK) {
                this.room.createConstructionSite(extensionPos.x, extensionPos.y, STRUCTURE_EXTENSION);
                this.memory[this.name].buildingPlans.extensionCount++;
                constructionSitesPlaced++;
            }
        }

        // Second Priority: Containers
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.needsContainers()) {
            const containerPositions = this.planContainerPositions();
            for (let pos of containerPositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                if (this.canBuildStructureAt(pos)) {
                    this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                    this.memory[this.name].buildingPlans.containerCount++;
                    constructionSitesPlaced++;
                }
            }
        }

        // Third Priority: Roads
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.shouldBuildRoads()) {
            const roadPositions = this.planRoadPositions();
            for (let pos of roadPositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                if (this.canBuildStructureAt(pos)) {
                    this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    constructionSitesPlaced++;
                }
            }
        }
    }

    needsExtensions(rcl) {
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl];
        const currentExtensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;
        return currentExtensions < maxExtensions;
    }

    needsContainers() {
        const sources = this.room.find(FIND_SOURCES);
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });
        return containers.length < sources.length;
    }

    planContainerPositions() {
        const positions = [];
        const sources = this.room.find(FIND_SOURCES);
        
        for (let source of sources) {
            const area = this.room.lookForAtArea(LOOK_TERRAIN,
                source.pos.y - 1, source.pos.x - 1,
                source.pos.y + 1, source.pos.x + 1, true);
            
            for (let spot of area) {
                if (spot.terrain !== 'wall') {
                    positions.push(new RoomPosition(spot.x, spot.y, this.room.name));
                }
            }
        }
        return positions;
    }

    planRoadPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return positions;

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
                positions.push(new RoomPosition(step.x, step.y, this.room.name));
            }
        }
        
        return positions;
    }

    findExtensionPosition(spawnPos) {
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

    canBuildStructureAt(pos) {
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        return structures.length === 0 && sites.length === 0 && 
               pos.lookFor(LOOK_TERRAIN)[0] !== 'wall';
    }

    shouldBuildRoads() {
        if (this.room.controller.level < 2) return false;
        
        const roads = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_ROAD }
        });

        return roads.length < 10;
    }
}

module.exports = BuildingStateMachine;