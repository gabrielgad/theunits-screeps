class CreepRepairer {
    static calculateTarget(roomState) {
        const regularStructures = roomState.room.find(FIND_STRUCTURES, {
            filter: structure => {
                return structure.hits < structure.hitsMax && 
                       structure.structureType !== STRUCTURE_WALL && 
                       structure.structureType !== STRUCTURE_RAMPART;
            }
        });
        
        const ramparts = roomState.room.find(FIND_STRUCTURES, {
            filter: structure => {
                return structure.hits < structure.hitsMax && 
                       structure.structureType === STRUCTURE_RAMPART;
            }
        });

        let regularDamageRatio = regularStructures.reduce((sum, structure) => {
            return sum + (1 - (structure.hits / structure.hitsMax));
        }, 0);

        // Reduced rampart scaling significantly
        let rampartDamageRatio = ramparts.reduce((sum, structure) => {
            return sum + (1 - (structure.hits / structure.hitsMax));
        }, 0) * 0.2; // Reduced from 0.5 to 0.2

        // Smaller rampart count bonus
        let rampartCountBonus = Math.ceil(ramparts.length / 8); // Changed from 4 to 8
        
        let baseTarget = Math.ceil((regularDamageRatio + rampartDamageRatio) / 3); // Changed from 2 to 3
        
        // Reduced max repairers scaling
        let maxRepairers = Math.min(
            Math.floor(roomState.roomLevel * 0.75) + // Changed from 1.5 to 0.75
            (ramparts.length > 0 ? Math.min(Math.ceil(ramparts.length / 8), roomState.roomLevel / 2) : 0),
            roomState.roomLevel // Hard cap at RCL
        );

        let target = Math.min(
            baseTarget + rampartCountBonus,
            maxRepairers
        );

        return Math.max(1, Math.min(target, 3)); // Added upper limit of 3 repairers
    }

    static getBody(energy) {
        // Body configurations remain unchanged as they're well balanced
        const bodies = [
            { cost: 200, body: [WORK, CARRY, MOVE] },
            { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] },
            { cost: 500, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 600, body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 800, body: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE] },
            { cost: 1000, body: [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] },
            { cost: 1200, body: [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] }
        ];

        const selected = bodies
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[0]);
        return selected.body;
    }
}

module.exports = CreepRepairer;