class ExecuteHarvest {
    static execute(creep) {
        // Try to get assigned source from memory
        let source = null;
        if (creep.memory.sourceId) {
            source = Game.getObjectById(creep.memory.sourceId);
        }

        // If no source is assigned or the assigned source is depleted
        if (!source || source.energy === 0) {
            source = this.findBestSource(creep);
            if (source) {
                creep.memory.sourceId = source.id;
            }
        }

        if (source) {
            const harvestResult = creep.harvest(source);
            
            if (harvestResult === ERR_NOT_IN_RANGE) {
                // Find optimal position near source
                const harvestPos = this.findOptimalHarvestPosition(creep, source);
                
                if (harvestPos) {
                    // Move to the optimal position
                    creep.moveTo(harvestPos, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        reusePath: 20,  // Cache path for 20 ticks
                        maxRooms: 1,    // Don't path through other rooms
                        plainsColor: '#ffaa00',
                        swampColor: '#ffcc00',
                        costCallback: (roomName, costMatrix) => {
                            // Avoid positions where other creeps are harvesting
                            const room = Game.rooms[roomName];
                            if (room) {
                                room.find(FIND_MY_CREEPS).forEach(otherCreep => {
                                    if (otherCreep.id !== creep.id && 
                                        otherCreep.memory.role === 'harvester' &&
                                        otherCreep.memory.sourceId === source.id) {
                                        costMatrix.set(otherCreep.pos.x, otherCreep.pos.y, 255);
                                    }
                                });
                            }
                            return costMatrix;
                        }
                    });
                }
            }
        }
    }

    static findBestSource(creep) {
        const sources = creep.room.find(FIND_SOURCES);
        
        if (sources.length === 0) return null;
        
        // Get all harvesters and their assigned sources
        const harvesters = creep.room.find(FIND_MY_CREEPS, {
            filter: c => c.memory.role === 'harvester' && c.id !== creep.id
        });
        
        const sourceAssignments = {};
        sources.forEach(source => {
            sourceAssignments[source.id] = {
                source: source,
                harvesterCount: 0,
                availableSpots: this.countAvailableSpots(source),
                energyAvailable: source.energy
            };
        });
        
        // Count current assignments
        harvesters.forEach(harvester => {
            if (harvester.memory.sourceId && sourceAssignments[harvester.memory.sourceId]) {
                sourceAssignments[harvester.memory.sourceId].harvesterCount++;
            }
        });
        
        // Score each source
        return Object.values(sourceAssignments)
            .filter(assignment => 
                assignment.harvesterCount < assignment.availableSpots &&
                assignment.energyAvailable > 0
            )
            .map(assignment => ({
                source: assignment.source,
                score: this.calculateSourceScore(creep, assignment)
            }))
            .sort((a, b) => b.score - a.score)
            .map(scored => scored.source)[0];
    }

    static calculateSourceScore(creep, assignment) {
        const distance = creep.pos.getRangeTo(assignment.source);
        const occupancyRatio = assignment.harvesterCount / assignment.availableSpots;
        const energyRatio = assignment.energyAvailable / assignment.source.energyCapacity;
        
        // Weight factors
        const DISTANCE_WEIGHT = 0.4;
        const OCCUPANCY_WEIGHT = 0.4;
        const ENERGY_WEIGHT = 0.2;
        
        // Calculate score (higher is better)
        return (
            (1 - distance / 50) * DISTANCE_WEIGHT +
            (1 - occupancyRatio) * OCCUPANCY_WEIGHT +
            energyRatio * ENERGY_WEIGHT
        );
    }

    static countAvailableSpots(source) {
        let count = 0;
        const terrain = source.room.getTerrain();
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const x = source.pos.x + dx;
                const y = source.pos.y + dy;
                
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    count++;
                }
            }
        }
        
        return count;
    }

    static findOptimalHarvestPosition(creep, source) {
        const terrain = source.room.getTerrain();
        let bestPos = null;
        let bestScore = -1;
        
        // Check all positions around source
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const x = source.pos.x + dx;
                const y = source.pos.y + dy;
                
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    const pos = new RoomPosition(x, y, source.room.name);
                    const score = this.evaluateHarvestPosition(creep, pos, source);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = pos;
                    }
                }
            }
        }
        
        return bestPos;
    }

    static evaluateHarvestPosition(creep, pos, source) {
        // Check if position is already occupied
        const occupied = pos.lookFor(LOOK_CREEPS).length > 0;
        if (occupied) return -1;
        
        let score = 100;
        
        // Prefer positions closer to current position
        score -= creep.pos.getRangeTo(pos) * 2;
        
        // Penalize swamp tiles
        if (pos.lookFor(LOOK_TERRAIN)[0] === 'swamp') {
            score -= 20;
        }
        
        return score;
    }
}

module.exports = ExecuteHarvest;