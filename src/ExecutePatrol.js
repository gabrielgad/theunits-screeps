class ExecutePatrol {
    static execute(creep) {
        // Initialize random move timer if not set
        if (!creep.memory.moveTimer) {
            creep.memory.moveTimer = 0;
        }
 
        // Decrement timer and get new direction if expired
        if (--creep.memory.moveTimer <= 0) {
            creep.memory.direction = Math.floor(Math.random() * 8);
            creep.memory.moveTimer = 10; // Move in this direction for 10 ticks
        }
 
        // Stay within 10 tiles of spawn
        const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (spawn && creep.pos.getRangeTo(spawn) > 10) {
            creep.moveTo(spawn);
            return;
        }
 
        // Move in current random direction
        creep.move(creep.memory.direction);
    }
 }
 
 module.exports = ExecutePatrol;