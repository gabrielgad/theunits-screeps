const StateMachine = require('StateMachine');
const PlannerExtension = require('PlannerExtension');
const PlannerContainer = require('PlannerContainer');
const PlannerRoad = require('PlannerRoad');
const PlannerTower = require('PlannerTower');
const PlannerStorage = require('PlannerStorage');

class BuildingStateMachine extends StateMachine {
    constructor(room) {
        super('Building_' + room.name);
        this.room = room;
        
        // Initialize planners
        this.extensionPlanner = new PlannerExtension(room);
        this.containerPlanner = new PlannerContainer(room);
        this.roadPlanner = new PlannerRoad(room);
        this.towerPlanner = new PlannerTower(room);
        this.storagePlanner = new PlannerStorage(room);
        
        // Initialize building plans in memory with validation
        if (!this.memory[this.name] || !this.memory[this.name].buildingPlans) {
            this.memory[this.name] = {
                buildingPlans: {
                    extensionCount: 0,
                    containerCount: 0,
                    roadPositions: [],
                    towerCount: 0,
                    hasStorage: false
                }
            };
        }
    }

    run() {
        // Check for existing construction sites
        const existingConstructionSites = this.room.find(FIND_CONSTRUCTION_SITES);
        if (existingConstructionSites.length >= 10) {
            return; // Too many construction sites, wait until some are completed
        }

        // Validate current structure counts
        this.validateStructureCounts();

        // Don't build if energy levels are too low
        if (this.room.energyAvailable < this.room.energyCapacityAvailable * 0.5) {
            return;
        }

        this.processBuildingNeeds();
    }

    validateStructureCounts() {
        // Get actual counts of structures
        const extensions = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        });
        const towers = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        });
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });
        const storage = this.room.storage;

        // Update memory to reflect actual counts
        this.memory[this.name].buildingPlans.extensionCount = extensions.length;
        this.memory[this.name].buildingPlans.towerCount = towers.length;
        this.memory[this.name].buildingPlans.containerCount = containers.length;
        this.memory[this.name].buildingPlans.hasStorage = !!storage;
    }

    processBuildingNeeds() {
        const rcl = this.room.controller.level;
        let constructionSitesPlaced = 0;
        const MAX_SITES_PER_TICK = 3;

        // First Priority: Extensions
        if (this.extensionPlanner.needsExtensions(rcl)) {
            const extensionPos = this.extensionPlanner.findNextPosition(this.room.find(FIND_MY_SPAWNS)[0].pos);
            if (extensionPos && constructionSitesPlaced < MAX_SITES_PER_TICK) {
                const result = this.room.createConstructionSite(extensionPos.x, extensionPos.y, STRUCTURE_EXTENSION);
                if (result === OK) {
                    this.memory[this.name].buildingPlans.extensionCount++;
                    constructionSitesPlaced++;
                }
            }
        }

        // Second Priority: Containers
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.containerPlanner.needsContainers()) {
            const containerPositions = this.containerPlanner.planPositions();
            for (let pos of containerPositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                
                const result = this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                if (result === OK) {
                    this.memory[this.name].buildingPlans.containerCount++;
                    constructionSitesPlaced++;
                }
            }
        }

        // Third Priority: Towers
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.towerPlanner.needsTowers(rcl)) {
            const towerPositions = this.towerPlanner.planPositions();
            for (let pos of towerPositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                
                const result = this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
                if (result === OK) {
                    this.memory[this.name].buildingPlans.towerCount++;
                    constructionSitesPlaced++;
                }
            }
        }

        // Fourth Priority: Storage
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && 
            this.storagePlanner.needsStorage(rcl) && 
            !this.memory[this.name].buildingPlans.hasStorage) {
            const storagePositions = this.storagePlanner.planPositions();
            for (let pos of storagePositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                
                const result = this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_STORAGE);
                if (result === OK) {
                    this.memory[this.name].buildingPlans.hasStorage = true;
                    constructionSitesPlaced++;
                }
            }
        }

        // Fifth Priority: Roads
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.roadPlanner.shouldBuildRoads()) {
            const existingRoadSites = this.room.find(FIND_CONSTRUCTION_SITES, {
                filter: { structureType: STRUCTURE_ROAD }
            });

            if (existingRoadSites.length < 10) {
                const roadPositions = this.roadPlanner.planPositions();
                const remainingRoadSites = 10 - existingRoadSites.length;
                
                for (let pos of roadPositions) {
                    if (constructionSitesPlaced >= MAX_SITES_PER_TICK || 
                        constructionSitesPlaced >= remainingRoadSites) break;
                    
                    const result = this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    if (result === OK) {
                        constructionSitesPlaced++;
                    }
                }
            }
        }
    }
}

module.exports = BuildingStateMachine;