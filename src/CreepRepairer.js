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

        // Adjusted rampart calculation to scale better with large numbers
        let rampartDamageRatio = ramparts.reduce((sum, structure) => {
            return sum + (1 - (structure.hits / structure.hitsMax));
        }, 0) * 0.5; // Reduced multiplier but added count-based scaling below

        // Add bonus based on number of ramparts
        let rampartCountBonus = Math.ceil(ramparts.length / 4);
        
        let baseTarget = Math.ceil((regularDamageRatio + rampartDamageRatio) / 2);
        
        // Scale max repairers based on RCL and rampart count
        let maxRepairers = Math.floor(roomState.roomLevel * 1.5) + 
            (ramparts.length > 0 ? Math.min(Math.ceil(ramparts.length / 5), roomState.roomLevel) : 0);

        let target = Math.min(
            baseTarget + rampartCountBonus,
            maxRepairers
        );

        return Math.max(1, target);
    }

    static getBody(energy) {
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