// src/structure.planner.js
module.exports = {
    run: function(room) {
        // Plan container placement near sources
        this.planSourceContainers(room);
        // Plan controller container
        this.planControllerContainer(room);
    },

    planSourceContainers: function(room) {
        const sources = room.find(FIND_SOURCES);
        
        sources.forEach(source => {
            // Check if container already exists or is being built
            const existingContainer = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];
            
            const constructionSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];
            
            if (!existingContainer && !constructionSite) {
                // Find optimal container position
                const containerPos = this.findOptimalContainerPosition(source);
                if (containerPos) {
                    room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
                    // Save container position in room memory
                    if (!room.memory.containerPositions) {
                        room.memory.containerPositions = {};
                    }
                    room.memory.containerPositions[source.id] = {
                        x: containerPos.x,
                        y: containerPos.y
                    };
                }
            }
        });
    },

    planControllerContainer: function(room) {
        const controller = room.controller;
        if (!controller) return;

        // Check existing container
        const existingContainer = controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        const constructionSite = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (!existingContainer && !constructionSite) {
            const containerPos = this.findOptimalContainerPosition(controller, 3);
            if (containerPos) {
                room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
                // Save controller container position
                if (!room.memory.containerPositions) {
                    room.memory.containerPositions = {};
                }
                room.memory.containerPositions.controller = {
                    x: containerPos.x,
                    y: containerPos.y
                };
            }
        }
    },

    findOptimalContainerPosition: function(target, range = 1) {
        const room = target.room;
        const positions = [];
        
        // Get all positions in range
        for (let x = -range; x <= range; x++) {
            for (let y = -range; y <= range; y++) {
                const pos = new RoomPosition(
                    target.pos.x + x,
                    target.pos.y + y,
                    room.name
                );
                
                // Check if position is walkable and empty
                if (this.isValidBuildPosition(pos)) {
                    positions.push(pos);
                }
            }
        }

        // Sort positions by distance to spawn
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn) {
            positions.sort((a, b) => {
                return a.getRangeTo(spawn) - b.getRangeTo(spawn);
            });
        }

        return positions[0];
    },

    isValidBuildPosition: function(pos) {
        const terrain = pos.lookFor(LOOK_TERRAIN)[0];
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const constructionSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        
        return terrain !== 'wall' && 
               structures.length === 0 && 
               constructionSites.length === 0;
    }
};