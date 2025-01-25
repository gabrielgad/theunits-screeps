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

        // Third Priority: Roads (with site limit)
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.shouldBuildRoads()) {
            const existingRoadSites = this.room.find(FIND_CONSTRUCTION_SITES, {
                filter: { structureType: STRUCTURE_ROAD }
            });

            if (existingRoadSites.length < 10) {  // Cap road construction sites at 10
                const roadPositions = this.planRoadPositions();
                const remainingRoadSites = 10 - existingRoadSites.length;
                
                for (let pos of roadPositions) {
                    if (constructionSitesPlaced >= MAX_SITES_PER_TICK || 
                        constructionSitesPlaced >= remainingRoadSites) break;
                    if (this.canBuildStructureAt(pos)) {
                        this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                        constructionSitesPlaced++;
                    }
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
        // Need containers for: sources + controller + extension area
        return containers.length < sources.length + 2;
    }

    planContainerPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Add positions near sources
        const sources = this.room.find(FIND_SOURCES);
        for (let source of sources) {
            const area = this.room.lookForAtArea(LOOK_TERRAIN,
                source.pos.y - 1, source.pos.x - 1,
                source.pos.y + 1, source.pos.x + 1, true);
            
            // Find closest non-wall position to source
            let bestPos = null;
            let bestDistance = Infinity;
            for (let spot of area) {
                if (spot.terrain !== 'wall') {
                    const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                    const distance = source.pos.getRangeTo(pos);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPos = pos;
                    }
                }
            }
            if (bestPos) positions.push(bestPos);
        }

        // Add position near controller
        const controllerArea = this.room.lookForAtArea(LOOK_TERRAIN,
            this.room.controller.pos.y - 1, this.room.controller.pos.x - 1,
            this.room.controller.pos.y + 1, this.room.controller.pos.x + 1, true);
        
        let bestControllerPos = null;
        let bestControllerDistance = Infinity;
        for (let spot of controllerArea) {
            if (spot.terrain !== 'wall') {
                const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                const distance = this.room.controller.pos.getRangeTo(pos);
                if (distance < bestControllerDistance) {
                    bestControllerDistance = distance;
                    bestControllerPos = pos;
                }
            }
        }
        if (bestControllerPos) positions.push(bestControllerPos);

        // Add position near extensions
        const extensionCenter = this.findExtensionPosition(spawn.pos);
        if (extensionCenter) {
            positions.push(extensionCenter);
        }
        
        return positions;
    }

    planRoadPositions() {
        const positions = new Set();
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return Array.from(positions);

        // Only get paths to sources and controller, not every extension
        const destinations = [
            ...this.room.find(FIND_SOURCES),
            this.room.controller
        ];

        // Find paths between spawn and each destination
        for (let dest of destinations) {
            const path = spawn.pos.findPathTo(dest, {
                ignoreCreeps: true,
                swampCost: 2
            });
            
            for (let step of path) {
                positions.add(`${step.x},${step.y}`);
            }
        }
        
        // Add just a few strategic roads near extensions rather than paths to each one
        const extensionArea = this.findExtensionPosition(spawn.pos);
        if (extensionArea) {
            // Add a single path to the extension area
            const pathToExtensions = spawn.pos.findPathTo(extensionArea, {
                ignoreCreeps: true,
                swampCost: 2
            });
            
            for (let step of pathToExtensions) {
                positions.add(`${step.x},${step.y}`);
            }
        }
        
        // Convert Set back to RoomPositions
        return Array.from(positions).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return new RoomPosition(x, y, this.room.name);
        });
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
        return this.room.controller.level >= 2;
    }
}

module.exports = BuildingStateMachine;