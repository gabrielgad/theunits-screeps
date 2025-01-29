class ExecuteTravelToRoom {
    static execute(creep) {
        if (!creep.memory.targetRoom) return;
        
        if (creep.room.name !== creep.memory.targetRoom) {
            const exitDir = Game.map.findExit(creep.room, creep.memory.targetRoom);
            const exit = creep.pos.findClosestByPath(exitDir);
            creep.moveTo(exit, {
                visualizePathStyle: { stroke: '#ffaa00' },
                reusePath: 50
            });
        }
    }
}
module.exports = ExecuteTravelToRoom;