class ExecutePatrol {
    static execute(creep) {
        const flags = creep.room.find(FIND_FLAGS, {
            filter: f => f.name.startsWith('Patrol')
        });
        
        if (flags.length > 0) {
            const currentFlagIndex = creep.memory.patrolIndex || 0;
            const targetFlag = flags[currentFlagIndex];
            
            if (creep.pos.isEqualTo(targetFlag.pos)) {
                creep.memory.patrolIndex = (currentFlagIndex + 1) % flags.length;
            } else {
                creep.moveTo(targetFlag, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        } else {
            // Default patrol around spawn if no flags
            const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
            if (spawn && creep.pos.getRangeTo(spawn) > 5) {
                creep.moveTo(spawn, {
                    visualizePathStyle: {stroke: '#ffffff'}
                });
            }
        }
    }
}

module.exports = ExecutePatrol;