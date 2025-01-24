// role.harvester.js
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

        if(creep.memory.targetSource) {
            const source = Game.getObjectById(creep.memory.targetSource);
            if(source) {
                const optimalPos = sourceManager.getOptimalMiningPosition(source, creep);
                if(optimalPos) {
                    // Move to optimal position
                    if(creep.pos.x !== optimalPos.x || creep.pos.y !== optimalPos.y) {
                        creep.moveTo(optimalPos.x, optimalPos.y, {visualizePathStyle: {stroke: '#ffaa00'}});
                        return;
                    }

                    // We're at the optimal position
                    // First, help build container if there's a construction site
                    const constructionSite = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 0, {
                        filter: site => site.structureType === STRUCTURE_CONTAINER
                    })[0];

                    if(constructionSite) {
                        if(creep.store.getFreeCapacity() > 0) {
                            creep.harvest(source);
                        } else {
                            creep.build(constructionSite);
                        }
                        return;
                    }

                    // Check for container
                    const container = creep.pos.findInRange(FIND_STRUCTURES, 0, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    })[0];

                    // Harvest and handle energy
                    if(creep.store.getFreeCapacity() > 0) {
                        creep.harvest(source);
                    } else if(container) {
                        creep.transfer(container, RESOURCE_ENERGY);
                    } else {
                        creep.drop(RESOURCE_ENERGY);
                    }
                }
            }
        }
    }
};