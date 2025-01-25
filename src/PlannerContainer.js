class PlannerContainer {
    constructor(room) {
        this.room = room;
    }

    needsContainers() {
        const sources = this.room.find(FIND_SOURCES);
        const containers = this.room.find(FIND_STRUCTURES, {
            filter: { structureType: STRUCTURE_CONTAINER }
        });
        
        // Check specifically for a container near controller
        const controllerContainers = containers.filter(c => 
            c.pos.getRangeTo(this.room.controller) <= 2
        );
        
        // Need containers for: sources + controller + extension area
        return containers.length < sources.length + 2 || controllerContainers.length === 0;
    }

    planPositions() {
        const positions = [];
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        
        // Add positions near sources
        this.addSourceContainers(positions);
        
        // Add position near controller
        this.addControllerContainer(positions);

        // Add position near extensions
        const extensionPlanner = new (require('PlannerExtension'))(this.room);
        const extensionCenter = extensionPlanner.findNextPosition(spawn.pos);
        if (extensionCenter) {
            positions.push(extensionCenter);
        }
        
        return positions;
    }

    addSourceContainers(positions) {
        const sources = this.room.find(FIND_SOURCES);
        for (let source of sources) {
            const area = this.room.lookForAtArea(LOOK_TERRAIN,
                source.pos.y - 1, source.pos.x - 1,
                source.pos.y + 1, source.pos.x + 1, true);
            
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
    }

    addControllerContainer(positions) {
        const controllerArea = this.room.lookForAtArea(LOOK_TERRAIN,
            this.room.controller.pos.y - 2, this.room.controller.pos.x - 2,
            this.room.controller.pos.y + 2, this.room.controller.pos.x + 2, true);
        
        let bestPos = null;
        let bestDistance = Infinity;
        
        for (let spot of controllerArea) {
            if (spot.terrain !== 'wall') {
                const pos = new RoomPosition(spot.x, spot.y, this.room.name);
                const distance = this.room.controller.pos.getRangeTo(pos);
                
                const structures = this.room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                const constructionSites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
                
                if (distance >= 1 && distance <= 2 && 
                    structures.length === 0 && 
                    constructionSites.length === 0) {
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestPos = pos;
                        }
                }
            }
        }
        
        if (bestPos) positions.push(bestPos);
    }
}

module.exports = PlannerContainer;