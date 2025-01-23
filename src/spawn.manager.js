// Update spawn.manager.js
module.exports = {
    run: function() {
        let spawn = Game.spawns['Spawn1'];
        
        // Count existing creeps
        const counts = {
            harvester: _.filter(Game.creeps, creep => creep.memory.role == 'harvester').length,
            hauler: _.filter(Game.creeps, creep => creep.memory.role == 'hauler').length,
            upgrader: _.filter(Game.creeps, creep => creep.memory.role == 'upgrader').length,
            builder: _.filter(Game.creeps, creep => creep.memory.role == 'builder').length,
            repairer: _.filter(Game.creeps, creep => creep.memory.role == 'repairer').length
        };
        
        // Define desired counts based on room level
        const desiredCounts = {
            harvester: 2,
            hauler: 2,
            upgrader: 2,
            builder: 1,
            repairer: 1
        };
        
        // Get body parts based on available energy
        let getBody = function(role, energy) {
            if(role === 'hauler') {
                if(energy >= 400) return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
                return [CARRY, CARRY, MOVE, MOVE];
            }
            if(energy >= 550) {
                return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
            }
            if(energy >= 400) {
                return [WORK, WORK, CARRY, MOVE, MOVE];
            }
            return [WORK, CARRY, MOVE];
        };
        
        // Spawn priority order
        const spawnOrder = ['harvester', 'hauler', 'upgrader', 'builder', 'repairer'];
        
        // Find first role that needs spawning
        const roleToSpawn = spawnOrder.find(role => counts[role] < desiredCounts[role]);
        
        if(roleToSpawn) {
            const name = roleToSpawn.charAt(0).toUpperCase() + roleToSpawn.slice(1) + Game.time;
            const body = getBody(roleToSpawn, spawn.room.energyAvailable);
            
            spawn.spawnCreep(body, name, {
                memory: {role: roleToSpawn}
            });
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