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
        const totalMiningPositions = _.sum(sources, source => 
            this.getAccessibleMiningPositions(source).length
        );
        
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
        const isEnergyLow = roomState.energyAvailable < 300; // Can't make 2 WORK harvesters
        const noHarvesters = currentHarvesters === 0;
        const insufficientWorkParts = existingWorkParts < sources.length * 2; // Minimum 2 WORK per source

        if (isEnergyLow && (noHarvesters || insufficientWorkParts)) {
            // Crisis mode: Ensure at least 1 harvester per source
            return Math.min(sources.length, totalMiningPositions);
        }

        // Normal mode calculation
        const targetWorkPartsPerSource = 5;
        const totalWorkPartsNeeded = sources.length * targetWorkPartsPerSource;
        
        // Get best possible body at current energy capacity
        const bestPossibleBody = this.getBody(roomState.energyCapacity);
        const workPartsPerCreep = bestPossibleBody.filter(part => part === WORK).length;
        
        // Calculate needed harvesters based on work parts
        const targetHarvesters = Math.min(
            Math.ceil(totalWorkPartsNeeded / workPartsPerCreep),
            totalMiningPositions, // Never exceed available positions
            4 // Hard cap at 4 harvesters until room level increases
        );

        console.log(`Room ${roomState.room.name} harvester calculation:`, {
            totalMiningPositions,
            existingWorkParts,
            currentHarvesters,
            workPartsPerCreep,
            targetHarvesters,
            isEnergyLow,
            energyAvailable: roomState.energyAvailable
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