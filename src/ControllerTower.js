class ControllerTower {
    static execute(roomState) {
        for (const tower of roomState.towers) {
            if (roomState.hostiles.length > 0) {
                const target = this.findClosestHostile(tower, roomState.hostiles);
                tower.attack(target);
            } else if (roomState.damagedStructures.length > 0) {
                const target = this.findPriorityRepairTarget(roomState.damagedStructures);
                tower.repair(target);
            } else {
                const target = this.findEnergyNeedingStructure(tower);
                if (target) {
                    tower.transfer(target, RESOURCE_ENERGY);
                }
            }
        }
    }

    static findClosestHostile(tower, hostiles) {
        return tower.pos.findClosestByRange(hostiles);
    }

    static findPriorityRepairTarget(structures) {
        // Priority groups
        const priorities = {
            high: ['rampart', 'spawn', 'storage', 'terminal'],
            medium: ['extension', 'container', 'road'],
            low: ['constructedWall']
        };

        // Find most damaged structure in each priority group
        for (const group of Object.keys(priorities)) {
            const groupStructures = structures.filter(s => 
                priorities[group].includes(s.structureType)
            );
            
            if (groupStructures.length > 0) {
                const mostDamaged = groupStructures.reduce((most, current) => {
                    const currentDamageRatio = current.hits / current.hitsMax;
                    const mostDamageRatio = most.hits / most.hitsMax;
                    return currentDamageRatio < mostDamageRatio ? current : most;
                });

                // Only repair if below certain thresholds
                const repairThresholds = {
                    high: 0.9,    // 90% health
                    medium: 0.7,  // 70% health
                    low: 0.1     // 10% health
                };

                if (mostDamaged.hits / mostDamaged.hitsMax < repairThresholds[group]) {
                    return mostDamaged;
                }
            }
        }
        
        return null;
    }

    static findEnergyNeedingStructure(tower) {
        return tower.pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
    }
}

module.exports = ControllerTower;