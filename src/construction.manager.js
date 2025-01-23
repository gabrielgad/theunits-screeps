// src/construction.manager.js
module.exports = {
    run: function(room) {
        if(!room.memory.construction) {
            room.memory.construction = {
                extensionGroups: [],
                lastExtensionCheck: 0,
                buildQueue: [],
                layoutCenter: null
            };
        }

        // Find or establish base layout center
        if(!room.memory.construction.layoutCenter) {
            this.establishLayoutCenter(room);
        }

        // Process build queue more frequently
        this.processBuildQueue(room);

        // Slower updates for planning
        if(Game.time % 50 === 0) {
            this.planBaseLayout(room);
        }
    },

    establishLayoutCenter: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if(!spawn) return;

        // Analyze area around spawn for best base center
        const bestSpot = this.findOptimalBaseCenter(room, spawn.pos);
        room.memory.construction.layoutCenter = bestSpot;
    },

    findOptimalBaseCenter: function(room, spawnPos) {
        const terrain = room.getTerrain();
        let bestScore = -1;
        let bestPos = null;

        // Search in a 5x5 area around spawn
        for(let x = spawnPos.x - 2; x <= spawnPos.x + 2; x++) {
            for(let y = spawnPos.y - 2; y <= spawnPos.y + 2; y++) {
                if(x < 4 || x > 45 || y < 4 || y > 45) continue;

                let score = this.evaluateBasePosition(room, x, y, terrain);
                if(score > bestScore) {
                    bestScore = score;
                    bestPos = {x, y};
                }
            }
        }

        return bestPos || spawnPos;
    },

    evaluateBasePosition: function(room, x, y, terrain) {
        let score = 0;
        
        // Check surrounding area
        for(let dx = -4; dx <= 4; dx++) {
            for(let dy = -4; dy <= 4; dy++) {
                const pos = {x: x + dx, y: y + dy};
                
                // Penalize walls and exits
                if(terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
                    score -= 1;
                }
                
                // Bonus for being near sources
                const sources = room.find(FIND_SOURCES);
                sources.forEach(source => {
                    const distance = Math.abs(source.pos.x - pos.x) + Math.abs(source.pos.y - pos.y);
                    if(distance < 10) {
                        score += (10 - distance) * 0.5;
                    }
                });
                
                // Bonus for being near controller
                const controllerDistance = Math.abs(room.controller.pos.x - pos.x) + 
                                        Math.abs(room.controller.pos.y - pos.y);
                if(controllerDistance < 15) {
                    score += (15 - controllerDistance) * 0.3;
                }
            }
        }

        return score;
    },

    planBaseLayout: function(room) {
        const center = room.memory.construction.layoutCenter;
        if(!center) return;

        // Plan extensions in a spiral pattern
        this.planExtensionsSpiral(room, center);
        
        // Plan other structures
        if(room.controller.level >= 3) {
            this.planTowers(room, center);
        }
        
        if(room.controller.level >= 4) {
            this.planStorage(room, center);
        }
    },

    planExtensionsSpiral: function(room, center) {
        const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];
        const currentExtensions = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_EXTENSION }
        }).length;

        if(currentExtensions >= maxExtensions) return;

        const positions = this.generateSpiralPositions(center, 4);
        let placed = 0;

        for(let pos of positions) {
            if(placed >= (maxExtensions - currentExtensions)) break;
            
            if(this.isValidBuildPosition(room, pos, STRUCTURE_EXTENSION)) {
                this.addToBuildQueue(room, pos, STRUCTURE_EXTENSION);
                placed++;
            }
        }
    },

    generateSpiralPositions: function(center, radius) {
        const positions = [];
        let x = 0, y = 0;
        let dx = 0, dy = -1;
        
        for(let i = 0; i < Math.pow((radius * 2 + 1), 2); i++) {
            if((-radius <= x && x <= radius) && (-radius <= y && y <= radius)) {
                positions.push({
                    x: center.x + x * 2, // Space out structures
                    y: center.y + y * 2
                });
            }

            if(x === y || (x < 0 && x === -y) || (x > 0 && x === 1-y)) {
                [dx, dy] = [-dy, dx];
            }
            x += dx;
            y += dy;
        }
        
        return positions;
    },

    addToBuildQueue: function(room, pos, structureType, priority = 5) {
        room.memory.construction.buildQueue.push({
            pos: {x: pos.x, y: pos.y},
            type: structureType,
            priority: priority,
            added: Game.time
        });

        // Sort queue by priority
        room.memory.construction.buildQueue.sort((a, b) => a.priority - b.priority);
    },

    processBuildQueue: function(room) {
        const queue = room.memory.construction.buildQueue;
        if(!queue.length) return;

        // Process up to 3 items per tick
        for(let i = 0; i < Math.min(3, queue.length); i++) {
            const item = queue[i];
            
            // Skip if too many construction sites
            const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
            if(sites.length >= 10) break;

            // Create construction site
            const result = room.createConstructionSite(item.pos.x, item.pos.y, item.type);
            
            if(result === OK || result === ERR_INVALID_TARGET || result === ERR_FULL) {
                queue.splice(i, 1);
                i--;
            }
        }
    },

    isValidBuildPosition: function(room, pos, structureType) {
        // Check bounds
        if(pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48) return false;

        // Check terrain
        const terrain = room.getTerrain();
        if(terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

        // Check existing structures and sites
        const structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
        const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
        
        if(structures.length > 0 || sites.length > 0) return false;

        // Check spacing requirements
        if(structureType === STRUCTURE_EXTENSION) {
            return this.checkExtensionSpacing(room, pos);
        }

        return true;
    },

    checkExtensionSpacing: function(room, pos) {
        // Check if there's enough space around the extension
        for(let dx = -1; dx <= 1; dx++) {
            for(let dy = -1; dy <= 1; dy++) {
                if(dx === 0 && dy === 0) continue;
                
                const structures = room.lookForAt(LOOK_STRUCTURES, 
                    pos.x + dx, pos.y + dy);
                    
                for(let structure of structures) {
                    if(structure.structureType === STRUCTURE_EXTENSION) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
};