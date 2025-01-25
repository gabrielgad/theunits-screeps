class ExecuteBuild {
    static execute(creep) {
        const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
        
        if(constructionSites.length > 0) {
            const prioritizedSites = constructionSites.map(site => {
                const progressPercent = site.progress / site.progressTotal;
                
                const importanceWeights = {
                    [STRUCTURE_SPAWN]: 100,
                    [STRUCTURE_EXTENSION]: 90,
                    [STRUCTURE_STORAGE]: 85,
                    [STRUCTURE_TOWER]: 80,
                    [STRUCTURE_WALL]: 75,
                    [STRUCTURE_RAMPART]: 70,
                    [STRUCTURE_CONTAINER]: 60,
                    [STRUCTURE_LINK]: 55,
                    [STRUCTURE_ROAD]: 40,
                    default: 30
                };
                
                const importanceWeight = importanceWeights[site.structureType] || importanceWeights.default;
                const score = (progressPercent * 0.6 * 100) + (importanceWeight * 0.4);
                
                return {
                    site: site,
                    score: score,
                    distance: creep.pos.getRangeTo(site)
                };
            });
            
            const bestSite = prioritizedSites.reduce((best, current) => {
                const bestAdjustedScore = best.score - (best.distance * 0.5);
                const currentAdjustedScore = current.score - (current.distance * 0.5);
                return currentAdjustedScore > bestAdjustedScore ? current : best;
            });
            
            const buildResult = creep.build(bestSite.site);
            if(buildResult === ERR_NOT_IN_RANGE) {
                const colorIntensity = Math.min(255, Math.floor(bestSite.score * 2.55));
                const pathColor = `#${colorIntensity.toString(16).padStart(2, '0')}${colorIntensity.toString(16).padStart(2, '0')}ff`;
                
                creep.moveTo(bestSite.site, {
                    visualizePathStyle: {stroke: pathColor}
                });
            }
        } else {
            // If no construction sites exist, help upgrade the controller
            if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        }
    }
}

module.exports = ExecuteBuild;