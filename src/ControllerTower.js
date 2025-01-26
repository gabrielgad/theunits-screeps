class ControllerTower {
    static execute(roomState) {
        for (const tower of roomState.towers) {
            if (roomState.hostiles.length > 0) {
                const target = this.findClosestHostile(tower, roomState.hostiles);
                tower.attack(target);
            } else if (roomState.damagedStructures.length > 0) {
                const target = this.findMostDamagedStructure(roomState.damagedStructures);
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

    static findMostDamagedStructure(structures) {
        return structures.reduce((most, current) => 
            (current.hits / current.hitsMax < most.hits / most.hitsMax) ? current : most
        );
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