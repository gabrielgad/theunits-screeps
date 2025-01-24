// src/source.manager.js
module.exports = {
    run: function(room) {
        this.ensureSourceMemory(room);

        // Update source management every 10 ticks
        if(Game.time % 10 === 0) {
            this.updateSourceAssignments(room);
        }

        // Update mining positions and container status
        if(Game.time % 50 === 0) {
            this.updateMiningPositions(room);
            this.ensureContainers(room);
        }
    },

    ensureSourceMemory: function(room) {
        if(!room.memory.sources) {
            room.memory.sources = {};
        }

        // Initialize memory for any sources that don't have it
        const sources = room.find(FIND_SOURCES);
        sources.forEach(source => {
            if(!room.memory.sources[source.id]) {
                const miningPositions = this.calculateSourcePositions(source);
                const optimalContainerPos = this.findOptimalContainerPosition(source, miningPositions);
                
                room.memory.sources[source.id] = {
                    miners: [],
                    miningPositions: miningPositions,
                    containerId: null,
                    containerPos: optimalContainerPos,
                    accessPoints: miningPositions.length,
                    containerBuilding: false,
                    lastContainerCheck: Game.time
                };
            }
        });
    },

    findOptimalContainerPosition: function(source, miningPositions) {
        // If there's only one mining position, that's our container spot
        if(miningPositions.length === 1) {
            return miningPositions[0];
        }

        const terrain = source.room.getTerrain();
        let bestPos = null;
        let bestScore = -1;

        // Evaluate each mining position
        for(let pos of miningPositions) {
            let score = 0;
            
            // Check surrounding spaces for walkability
            for(let dx = -1; dx <= 1; dx++) {
                for(let dy = -1; dy <= 1; dy++) {
                    const x = pos.x + dx;
                    const y = pos.y + dy;
                    
                    if(x < 0 || x > 49 || y < 0 || y > 49) continue;
                    
                    // Reward walkable spaces
                    if(terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                        score++;
                    }
                }
            }

            // Bonus for positions that are closer to room center
            score += (50 - Math.abs(25 - pos.x) - Math.abs(25 - pos.y)) / 10;

            if(score > bestScore) {
                bestScore = score;
                bestPos = pos;
            }
        }

        return bestPos;
    },

    calculateSourcePositions: function(source) {
        const positions = [];
        const terrain = source.room.getTerrain();
        
        for(let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
            for(let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                if(x === source.pos.x && y === source.pos.y) continue;
                if(x < 0 || x > 49 || y < 0 || y > 49) continue;
                
                if(terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    positions.push({x, y});
                }
            }
        }
        
        return positions;
    },
    updateSourceAssignments: function(room) {
        const sources = room.find(FIND_SOURCES);
        const miners = _.filter(Game.creeps, creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === room.name
        );

        // Clear dead miners
        sources.forEach(source => {
            if(room.memory.sources[source.id]) {
                room.memory.sources[source.id].miners = room.memory.sources[source.id].miners.filter(
                    id => Game.getObjectById(id)
                );
            }
        });

        // Reassign miners
        miners.forEach(miner => {
            if(miner.memory.targetSource && room.memory.sources[miner.memory.targetSource]) {
                const sourceMemory = room.memory.sources[miner.memory.targetSource];
                if(!sourceMemory.miners.includes(miner.id) && 
                   sourceMemory.miners.length < sourceMemory.accessPoints) {
                    sourceMemory.miners.push(miner.id);
                }
            }
        });
    },

    ensureContainers: function(room) {
        const sources = room.find(FIND_SOURCES);
        
        sources.forEach(source => {
            const sourceMemory = room.memory.sources[source.id];
            if(!sourceMemory || !sourceMemory.containerPos) return;

            // Skip if we recently checked
            if(Game.time - sourceMemory.lastContainerCheck < 50) return;
            sourceMemory.lastContainerCheck = Game.time;

            const pos = sourceMemory.containerPos;
            
            // Check for existing container
            const container = new RoomPosition(pos.x, pos.y, room.name)
                .lookFor(LOOK_STRUCTURES)
                .find(s => s.structureType === STRUCTURE_CONTAINER);

            if(container) {
                sourceMemory.containerId = container.id;
                sourceMemory.containerBuilding = false;
                return;
            }

            // Check for construction site
            const constructionSite = new RoomPosition(pos.x, pos.y, room.name)
                .lookFor(LOOK_CONSTRUCTION_SITES)
                .find(s => s.structureType === STRUCTURE_CONTAINER);

            if(!constructionSite && !sourceMemory.containerBuilding) {
                // Create new construction site
                const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                if(result === OK) {
                    sourceMemory.containerBuilding = true;
                    console.log(`Created container construction site at source ${source.id}`);
                }
            }
        });
    },

    updateMiningPositions: function(room) {
        const sources = room.find(FIND_SOURCES);
        
        sources.forEach(source => {
            if(!room.memory.sources[source.id]) return;
            
            const sourceMemory = room.memory.sources[source.id];
            
            // Update container status
            if(sourceMemory.containerId) {
                const container = Game.getObjectById(sourceMemory.containerId);
                if(!container) {
                    sourceMemory.containerId = null;
                    sourceMemory.containerBuilding = false;
                }
            }

            // Verify mining positions are still valid
            sourceMemory.miningPositions = this.calculateSourcePositions(source);
            sourceMemory.accessPoints = sourceMemory.miningPositions.length;
        });
    },

    getOptimalMiningPosition: function(source, creep) {
        if(!source.room.memory.sources || !source.room.memory.sources[source.id]) {
            this.ensureSourceMemory(source.room);
        }

        const sourceMemory = source.room.memory.sources[source.id];
        if(!sourceMemory) return null;

        // If we have a container position and it's being used by this creep, use it
        if(sourceMemory.containerPos && 
           sourceMemory.miners[0] === creep.id) {
            return sourceMemory.containerPos;
        }

        // Otherwise find an available mining position
        const takenPositions = new Set(
            sourceMemory.miners
                .map(id => Game.getObjectById(id))
                .filter(miner => miner && miner.id !== creep.id)
                .map(miner => `${miner.pos.x},${miner.pos.y}`)
        );

        // Prefer container position if it's available
        if(sourceMemory.containerPos && 
           !takenPositions.has(`${sourceMemory.containerPos.x},${sourceMemory.containerPos.y}`)) {
            return sourceMemory.containerPos;
        }

        // Find any available position
        const availablePosition = sourceMemory.miningPositions.find(pos => 
            !takenPositions.has(`${pos.x},${pos.y}`)
        );

        return availablePosition || sourceMemory.miningPositions[0];
    },

    getSourceUtilization: function(source) {
        if(!source.room.memory.sources || !source.room.memory.sources[source.id]) {
            this.ensureSourceMemory(source.room);
        }

        const sourceMemory = source.room.memory.sources[source.id];
        if(!sourceMemory) {
            return {
                maxMiners: 1,
                currentMiners: 0,
                hasContainer: false,
                efficiency: 0,
                containerBuilding: false
            };
        }

        return {
            maxMiners: sourceMemory.accessPoints || 1,
            currentMiners: sourceMemory.miners.length,
            hasContainer: !!sourceMemory.containerId,
            containerBuilding: sourceMemory.containerBuilding,
            efficiency: sourceMemory.miners.length / (sourceMemory.accessPoints || 1)
        };
    }
};