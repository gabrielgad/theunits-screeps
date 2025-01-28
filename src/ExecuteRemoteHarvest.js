class ExecuteRemoteHarvest {
    static execute(creep) {
        if (!creep.memory.sourceId) {
            const sources = creep.room.find(FIND_SOURCES);
            creep.memory.sourceId = sources[0].id;
        }
        
        const source = Game.getObjectById(creep.memory.sourceId);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    reusePath: 20
                });
            }
        }
    }
}

module.exports = ExecuteRemoteHarvest;