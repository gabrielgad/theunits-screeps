class CreepHarvester {
    static getAccessibleMiningPositions(source) {
        const positions = [];
        const room = source.room;
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;
                
                const pos = new RoomPosition(
                    source.pos.x + x,
                    source.pos.y + y,
                    source.room.name
                );
                
                const terrain = room.getTerrain();
                if (terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL) {
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
        const sources = roomState.room.find(FIND_SOURCES);
        
        // Get current harvesters
        const roomHarvesters = Object.values(Game.creeps).filter(creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === roomState.room.name
        );
        
        const currentHarvesters = roomHarvesters.length;
        const existingWorkParts = _.sum(roomHarvesters, creep => 
            creep.getActiveBodyparts(WORK)
        );

        // Crisis mode detection
        const isEnergyLow = roomState.energyAvailable < 300;
        const noHarvesters = currentHarvesters === 0;
        
        if (isEnergyLow && noHarvesters) {
            // Crisis mode: Need at least one harvester
            return 1;
        }

        // Check limiting factors
        
        // 1. Physical space limit
        const totalMiningPositions = _.sum(sources, source => 
            this.getAccessibleMiningPositions(source).length
        );
        if (currentHarvesters >= totalMiningPositions) {
            return currentHarvesters; // Can't fit more harvesters
        }

        // 2. Work parts limit (5 per source)
        const maxWorkPartsNeeded = sources.length * 5;
        if (existingWorkParts >= maxWorkPartsNeeded) {
            return currentHarvesters; // Already have optimal work parts
        }

        // 3. Energy limit - what size harvester can we build?
        const bestPossibleBody = this.getBody(roomState.energyCapacity);
        const workPartsInNewCreep = bestPossibleBody.filter(part => part === WORK).length;
        
        // If adding a new harvester would exceed max work parts needed, don't add
        if (existingWorkParts + workPartsInNewCreep > maxWorkPartsNeeded) {
            return currentHarvesters;
        }

        console.log(`Room ${roomState.room.name} harvester calculation:`, {
            totalMiningPositions,
            existingWorkParts,
            maxWorkPartsNeeded,
            currentHarvesters,
            workPartsInNewCreep,
            isEnergyLow,
            energyAvailable: roomState.energyAvailable
        });

        // No limits reached, need another harvester
        return currentHarvesters + 1;
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