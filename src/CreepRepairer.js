class CreepRepairer {
    static calculateTarget(roomState) {
        // Check for towers first
        const towers = roomState.room.find(FIND_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_TOWER
        });

        // If we have an active tower with decent energy, we likely don't need repairers
        const activeTowers = towers.filter(tower => tower.store.getUsedCapacity(RESOURCE_ENERGY) > 400);
        if (activeTowers.length > 0) {
            // Check for structures far from towers that might need repair
            const distantDamagedStructures = this.findDistantDamagedStructures(roomState.room, activeTowers);
            if (distantDamagedStructures.length === 0) {
                return 0; // No repairers needed if towers can handle everything
            }
        }

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

        // If we have towers, only consider structures that are far from towers
        if (activeTowers.length > 0) {
            const farStructures = regularStructures.filter(structure => 
                !this.isInEffectiveTowerRange(structure.pos, activeTowers)
            );
            regularStructures.length = 0;
            regularStructures.push(...farStructures);
        }

        let regularDamageRatio = regularStructures.reduce((sum, structure) => {
            return sum + (1 - (structure.hits / structure.hitsMax));
        }, 0);

        // Only consider ramparts if they're far from towers or we have no towers
        let rampartDamageRatio = 0;
        if (activeTowers.length === 0 || ramparts.some(r => !this.isInEffectiveTowerRange(r.pos, activeTowers))) {
            rampartDamageRatio = ramparts.reduce((sum, structure) => {
                return sum + (1 - (structure.hits / structure.hitsMax));
            }, 0) * 0.1; // Further reduced from 0.2 to 0.1 due to tower presence
        }

        // Smaller rampart count bonus, only if no towers or far ramparts exist
        let rampartCountBonus = (activeTowers.length === 0) ? Math.ceil(ramparts.length / 10) : 0;
        
        let baseTarget = Math.ceil((regularDamageRatio + rampartDamageRatio) / 4); // Increased divisor from 3 to 4
        
        // Significantly reduced max repairers when towers exist
        let maxRepairers = Math.min(
            Math.floor(roomState.roomLevel * (activeTowers.length > 0 ? 0.3 : 0.75)) +
            (ramparts.length > 0 ? Math.min(Math.ceil(ramparts.length / 10), roomState.roomLevel / 3) : 0),
            roomState.roomLevel // Hard cap at RCL
        );

        let target = Math.min(
            baseTarget + rampartCountBonus,
            maxRepairers
        );

        // More restrictive cap when towers exist
        return Math.max(0, Math.min(target, activeTowers.length > 0 ? 1 : 2));
    }

    static isInEffectiveTowerRange(pos, towers) {
        return towers.some(tower => {
            const range = tower.pos.getRangeTo(pos);
            // Tower effectiveness drops off with range
            return range <= 5; // Only consider structures very close to towers
        });
    }

    static findDistantDamagedStructures(room, towers) {
        return room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.hits === structure.hitsMax) return false;
                if (structure.structureType === STRUCTURE_WALL) return false;
                // Check if structure is far from all towers
                return !this.isInEffectiveTowerRange(structure.pos, towers);
            }
        });
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