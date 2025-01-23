// src/role.defender.js
module.exports = {
    run: function(creep) {
        if(!creep.memory.defending) {
            creep.memory.defending = true;
        }

        // Find hostiles
        const hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        
        if(hostile) {
            // Attack mode
            if(creep.attack(hostile) == ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile, {
                    visualizePathStyle: {stroke: '#ff0000'},
                    reusePath: 0 // Don't reuse path when chasing enemies
                });
            }
        } else {
            // Patrol mode
            this.patrol(creep);
        }
    },

    patrol: function(creep) {
        // Get defensive positions from room memory
        const defensivePositions = creep.room.memory.defense.defensivePositions;
        if(!defensivePositions || defensivePositions.length === 0) return;

        // Set patrol target if none exists
        if(!creep.memory.patrolTarget) {
            creep.memory.patrolTarget = Math.floor(Math.random() * defensivePositions.length);
        }

        const targetPos = defensivePositions[creep.memory.patrolTarget];
        const pos = new RoomPosition(targetPos.x, targetPos.y, creep.room.name);

        // Move to patrol position
        if(creep.pos.getRangeTo(pos) > 0) {
            creep.moveTo(pos, {
                visualizePathStyle: {stroke: '#ffffff'}
            });
        } else {
            // Choose new patrol target
            creep.memory.patrolTarget = (creep.memory.patrolTarget + 1) % defensivePositions.length;
        }
    }
};