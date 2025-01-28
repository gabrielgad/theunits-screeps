class CreepHarvester {
    static getAccessibleMiningPositions(source) {
        const positions = [];
        const room = source.room;
        
        // Check all adjacent positions
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue; // Skip the source position itself
                
                const pos = new RoomPosition(
                    source.pos.x + x,
                    source.pos.y + y,
                    source.room.name
                );
                
                // Check if position is walkable
                const terrain = room.getTerrain();
                if (terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL) {
                    // Verify position is pathable from spawn/controller
                    const pathTestResult = room.findPath(room.controller.pos, pos, {
                        ignoreCreeps: true,
                        range: 1
                    });
                    
                    if (pathTestResult.length > 0) {
                        positions.push(pos);
                    }
                }
            }
        }
        
        return positions;
    }

    static calculateTarget(roomState) {
        // Calculate total accessible mining positions
        const sources = roomState.room.find(FIND_SOURCES);
        const totalMiningPositions = _.sum(sources, source => 
            this.getAccessibleMiningPositions(source).length
        );
        
        // We want 5 work parts per source, but limited by available positions
        const workPartsPerSource = 5;
        const totalWorkPartsNeeded = Math.min(
            sources.length * workPartsPerSource,
            totalMiningPositions * workPartsPerSource // Cap by available positions
        );
        
        // Get list of all harvesters in this room
        const roomHarvesters = Object.values(Game.creeps).filter(creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === roomState.room.name
        );
        
        // Count existing work parts from current harvesters
        const existingWorkParts = _.sum(roomHarvesters, creep => 
            creep.getActiveBodyparts(WORK)
        );
        
        // Calculate how many more work parts we need
        const workPartsNeeded = Math.max(0, totalWorkPartsNeeded - existingWorkParts);
        
        // Get current harvester count
        const currentHarvesters = roomHarvesters.length;
        
        // Get the best possible body we can make with current energy capacity
        const bestPossibleBody = this.getBody(roomState.energyCapacity);
        const workPartsPerCreep = bestPossibleBody.filter(part => part === WORK).length;
        
        // Calculate additional harvesters needed, capped by available positions
        const additionalHarvestersNeeded = Math.min(
            Math.ceil(workPartsNeeded / workPartsPerCreep),
            Math.max(0, totalMiningPositions - currentHarvesters)
        );
        
        // Final target is current harvesters plus additional needed
        const targetHarvesters = Math.min(
            currentHarvesters + additionalHarvestersNeeded,
            totalMiningPositions // Never exceed available mining positions
        );
        
        console.log(`Room ${roomState.room.name} harvester calculation:`, {
            totalMiningPositions,
            totalWorkPartsNeeded,
            existingWorkParts,
            workPartsNeeded,
            currentHarvesters,
            workPartsPerCreep,
            additionalHarvestersNeeded,
            targetHarvesters
        });
        
        return targetHarvesters;
    }
    
    static getBody(energy) {
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },                    // 1 work
            { cost: 300, body: [WORK, WORK, CARRY, MOVE] },             // 2 work
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }, // 2 work, better mobility
            { cost: 550, body: [WORK, WORK, WORK, CARRY, MOVE, MOVE] }, // 3 work
            { cost: 700, body: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE] }, // 4 work
            { cost: 800, body: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE] }  // 5 work
        ];
        
        return bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]).body;
    }
}

module.exports = CreepHarvester;