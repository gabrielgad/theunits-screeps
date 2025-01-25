const StateMachine = require('StateMachine');
const PlannerExtension = require('PlannerExtension');
const PlannerContainer = require('PlannerContainer');
const PlannerRoad = require('PlannerRoad');

class BuildingStateMachine extends StateMachine {
    constructor(room) {
        super('Building_' + room.name);
        this.room = room;
        
        // Initialize planners
        this.extensionPlanner = new PlannerExtension(room);
        this.containerPlanner = new PlannerContainer(room);
        this.roadPlanner = new PlannerRoad(room);
        
        // Initialize building plans in memory
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

        this.processBuildingNeeds();
    }

    processBuildingNeeds() {
        const rcl = this.room.controller.level;
        let constructionSitesPlaced = 0;
        const MAX_SITES_PER_TICK = 5;

        // First Priority: Extensions
        if (this.extensionPlanner.needsExtensions(rcl)) {
            const extensionPos = this.extensionPlanner.findNextPosition(this.room.find(FIND_MY_SPAWNS)[0].pos);
            if (extensionPos && constructionSitesPlaced < MAX_SITES_PER_TICK) {
                this.room.createConstructionSite(extensionPos.x, extensionPos.y, STRUCTURE_EXTENSION);
                this.memory[this.name].buildingPlans.extensionCount++;
                constructionSitesPlaced++;
            }
        }

        // Second Priority: Containers
        if (constructionSitesPlaced < MAX_SITES_PER_TICK && this.containerPlanner.needsContainers()) {
            const containerPositions = this.containerPlanner.planPositions();
            for (let pos of containerPositions) {
                if (constructionSitesPlaced >= MAX_SITES_PER_TICK) break;
                if (this.extensionPlanner.canBuildAt(pos)) {
                    this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                    this.memory[this.name].buildingPlans.containerCount++;
                    constructionSitesPlaced++;
                }
            }
        }

        // Third Priority: Roads
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
                    if (this.extensionPlanner.canBuildAt(pos)) {
                        this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                        constructionSitesPlaced++;
                    }
                }
            }
        }
    }
}

module.exports = BuildingStateMachine;