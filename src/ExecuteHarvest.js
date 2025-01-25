class ExecuteHarvest {
    static execute(creep) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if(source) {
            if(creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: {stroke: '#ffaa00'}
                });
            }
        }
    }
}

module.exports = ExecuteHarvest;