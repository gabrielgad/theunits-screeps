class CreepRepairer {
    static towerEnergyHistory = {};
    static lastCleanup = 0;
    
    static updateTowerEnergyHistory(tower) {
        const gameTime = Game.time;
        
        // Initialize history for this tower if it doesn't exist
        if (!this.towerEnergyHistory[tower.id]) {
            this.towerEnergyHistory[tower.id] = [];
        }
        
        // Add current energy level
        this.towerEnergyHistory[tower.id].push({
            time: gameTime,
            energy: tower.store.getUsedCapacity(RESOURCE_ENERGY)
        });
        
        // Keep only last 20 ticks
        while (this.towerEnergyHistory[tower.id].length > 0 && 
               this.towerEnergyHistory[tower.id][0].time < gameTime - 20) {
            this.towerEnergyHistory[tower.id].shift();
        }
        
        // Cleanup old tower histories every 100 ticks
        if (gameTime - this.lastCleanup > 100) {
            this.cleanupTowerHistories();
            this.lastCleanup = gameTime;
        }
    }
    
    static cleanupTowerHistories() {
        for (let towerId in this.towerEnergyHistory) {
            if (!Game.getObjectById(towerId)) {
                delete this.towerEnergyHistory[towerId];
            }
        }
    }
    
    static getAverageTowerEnergy(tower) {
        if (!this.towerEnergyHistory[tower.id] || this.towerEnergyHistory[tower.id].length === 0) {
            return tower.store.getUsedCapacity(RESOURCE_ENERGY);
        }
        
        const sum = this.towerEnergyHistory[tower.id].reduce((acc, record) => acc + record.energy, 0);
        return sum / this.towerEnergyHistory[tower.id].length;
    }

    static calculateTarget(roomState) {
        // Check for towers first
        const towers = roomState.room.find(FIND_STRUCTURES, {
            filter: structure => structure.structureType === STRUCTURE_TOWER
        });

        // Update and check average tower energy levels
        towers.forEach(tower => this.updateTowerEnergyHistory(tower));
        
        // If we have an active tower with decent average energy, we likely don't need repairers
        const activeTowers = towers.filter(tower => this.getAverageTowerEnergy(tower) > 200);
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
            }, 0) * 0.1;
        }

        let rampartCountBonus = (activeTowers.length === 0) ? Math.ceil(ramparts.length / 10) : 0;
        
        let baseTarget = Math.ceil((regularDamageRatio + rampartDamageRatio) / 4);
        
        let maxRepairers = Math.min(
            Math.floor(roomState.roomLevel * (activeTowers.length > 0 ? 0.3 : 0.75)) +
            (ramparts.length > 0 ? Math.min(Math.ceil(ramparts.length / 10), roomState.roomLevel / 3) : 0),
            roomState.roomLevel
        );

        let target = Math.min(
            baseTarget + rampartCountBonus,
            maxRepairers
        );

        return Math.max(0, Math.min(target, activeTowers.length > 0 ? 1 : 2));
    }

    static isInEffectiveTowerRange(pos, towers) {
        return towers.some(tower => {
            const range = tower.pos.getRangeTo(pos);
            return range <= 5;
        });
    }

    static findDistantDamagedStructures(room, towers) {
        return room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.hits === structure.hitsMax) return false;
                if (structure.structureType === STRUCTURE_WALL) return false;
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