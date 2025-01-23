// src/spawn.manager.js
module.exports = {
    run: function() {
        let spawn = Game.spawns['Spawn1'];
        
        // Count existing creeps
        let harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        let upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        
        // Spawn new creeps if needed
        if(harvesters.length < 2) {
            let newName = 'Harvester' + Game.time;
            spawn.spawnCreep([WORK, CARRY, MOVE], newName, 
                {memory: {role: 'harvester'}});
        }
        else if(upgraders.length < 2) {
            let newName = 'Upgrader' + Game.time;
            spawn.spawnCreep([WORK, CARRY, MOVE], newName,
                {memory: {role: 'upgrader'}});
        }
        
        // Show spawn status
        if(spawn.spawning) { 
            let spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1, 
                spawn.pos.y, 
                {align: 'left', opacity: 0.8}
            );
        }
    }
};