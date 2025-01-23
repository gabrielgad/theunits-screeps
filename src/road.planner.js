// src/road.planner.js
module.exports = {
    run: function(room) {
        if (!room.memory.roads) {
            room.memory.roads = { planned: {}, built: {} };
        }

        // Plan roads between key points
        this.planMainRoads(room);
        
        // Create construction sites for planned roads
        this.createPlannedRoads(room);
    },

    planMainRoads: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        // Get key positions
        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        const containers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        // Plan roads from spawn to each source
        sources.forEach(source => {
            const pathKey = `spawn-source-${source.id}`;
            if (!room.memory.roads.planned[pathKey]) {
                const path = spawn.pos.findPathTo(source, {
                    ignoreCreeps: true,
                    swampCost: 2
                });
                room.memory.roads.planned[pathKey] = path;
            }
        });

        // Plan roads from spawn to controller
        if (controller && !room.memory.roads.planned['spawn-controller']) {
            const path = spawn.pos.findPathTo(controller, {
                ignoreCreeps: true,
                swampCost: 2
            });
            room.memory.roads.planned['spawn-controller'] = path;
        }

        // Plan roads to containers
        containers.forEach(container => {
            const pathKey = `spawn-container-${container.id}`;
            if (!room.memory.roads.planned[pathKey]) {
                const path = spawn.pos.findPathTo(container, {
                    ignoreCreeps: true,
                    swampCost: 2
                });
                room.memory.roads.planned[pathKey] = path;
            }
        });
    },

    createPlannedRoads: function(room) {
        // Limit road construction to avoid depleting resources
        const maxRoadsPerTick = 3;
        let roadsCreated = 0;

        for (let pathKey in room.memory.roads.planned) {
            if (roadsCreated >= maxRoadsPerTick) break;
            
            const path = room.memory.roads.planned[pathKey];
            if (!room.memory.roads.built[pathKey]) {
                room.memory.roads.built[pathKey] = [];
                
                for (let i = 0; i < path.length; i++) {
                    const pos = path[i];
                    const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    if (result === OK) {
                        room.memory.roads.built[pathKey].push(pos);
                        roadsCreated++;
                        if (roadsCreated >= maxRoadsPerTick) break;
                    }
                }
            }
        }
    }
};