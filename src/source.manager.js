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
                room.memory.sources[source.id] = {
                    miners: [],
                    miningPositions: this.calculateSourcePositions(source),
                    containerId: null,
                    containerPos: null,
                    accessPoints: 0
                };
                room.memory.sources[source.id].accessPoints = 
                    room.memory.sources[source.id].miningPositions.length;
            }
        });
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

        // Clear current assignments
        sources.forEach(source => {
            if(room.memory.sources[source.id]) {
                room.memory.sources[source.id].miners = [];
            }
        });

        // Reassign miners
        miners.forEach(miner => {
            if(miner.memory.targetSource && room.memory.sources[miner.memory.targetSource]) {
                const sourceMemory = room.memory.sources[miner.memory.targetSource];
                if(sourceMemory.miners.length < sourceMemory.accessPoints) {
                    sourceMemory.miners.push(miner.id);
                }
            }
        });
    },

    updateMiningPositions: function(room) {
        const sources = room.find(FIND_SOURCES);
        
        sources.forEach(source => {
            if(!room.memory.sources[source.id]) return;
            
            const sourceMemory = room.memory.sources[source.id];
            
            // Check container status
            if(sourceMemory.containerId) {
                const container = Game.getObjectById(sourceMemory.containerId);
                if(!container) {
                    sourceMemory.containerId = null;
                    // Trigger container reconstruction
                    if(sourceMemory.containerPos) {
                        room.createConstructionSite(
                            sourceMemory.containerPos.x, 
                            sourceMemory.containerPos.y, 
                            STRUCTURE_CONTAINER
                        );
                    }
                }
            } else {
                // Look for new containers
                const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })[0];
                
                if(container) {
                    sourceMemory.containerId = container.id;
                    sourceMemory.containerPos = {x: container.pos.x, y: container.pos.y};
                }
            }
        });
    },

    getOptimalMiningPosition: function(source, creep) {
        if(!source.room.memory.sources || !source.room.memory.sources[source.id]) {
            this.ensureSourceMemory(source.room);
        }

        const sourceMemory = source.room.memory.sources[source.id];
        if(!sourceMemory) return null;

        // If container exists, prioritize container position
        if(sourceMemory.containerPos) {
            return sourceMemory.containerPos;
        }

        // Otherwise find available mining position
        const takenPositions = new Set(
            sourceMemory.miners
                .map(id => Game.getObjectById(id))
                .filter(miner => miner && miner.id !== creep.id)
                .map(miner => `${miner.pos.x},${miner.pos.y}`)
        );

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
                efficiency: 0
            };
        }

        return {
            maxMiners: sourceMemory.accessPoints || 1,
            currentMiners: sourceMemory.miners.length,
            hasContainer: !!sourceMemory.containerId,
            efficiency: sourceMemory.miners.length / (sourceMemory.accessPoints || 1)
        };
    }
};