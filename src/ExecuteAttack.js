class ExecuteAttack {
    static execute(creep) {
        const hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (hostile) {
            if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile, {
                    visualizePathStyle: {stroke: '#ff0000'}
                });
            }
        }
    }
}

module.exports = ExecuteAttack;