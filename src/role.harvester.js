// src/role.harvester.js
const sourceManager = require('source.manager');

module.exports = {
    run: function(creep) {
        if(!creep.memory.targetSource) {
            const sources = creep.room.find(FIND_SOURCES);
            for(let source of sources) {
                const utilization = sourceManager.getSourceUtilization(source);
                if(utilization.currentMiners < utilization.maxMiners) {
                    creep.memory.targetSource = source.id;
                    break;
                }
            }
        }

        if(creep.store.getFreeCapacity() > 0) {
            if(creep.memory.targetSource) {
                const source = Game.getObjectById(creep.memory.targetSource);
                if(source) {
                    const optimalPos = sourceManager.getOptimalMiningPosition(source, creep);
                    if(optimalPos) {
                        if(creep.pos.x !== optimalPos.x || creep.pos.y !== optimalPos.y) {
                            creep.moveTo(optimalPos.x, optimalPos.y, {visualizePathStyle: {stroke: '#ffaa00'}});
                        } else {
                            creep.harvest(source);
                        }
                    }
                }
            }
        } else {
            // Find nearby container
            const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                           s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if(container) {
                if(creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // If no container, find spawn or extensions
                let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_EXTENSION ||
                                structure.structureType == STRUCTURE_SPAWN) &&
                                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });

                if(target) {
                    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                }
            }
        }
    }
};