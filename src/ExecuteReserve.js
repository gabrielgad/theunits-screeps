class ExecuteReserve {
    static execute(creep) {
        if (creep.room.controller) {
            if (creep.reserveController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        }
    }
}

module.exports = ExecuteReserve;