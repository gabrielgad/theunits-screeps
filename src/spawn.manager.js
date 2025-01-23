// src/spawn.manager.js
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
        
        // Calculate desired counts based on room state
        const room = spawn.room;
        const sources = room.find(FIND_SOURCES);
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        const containers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        const desiredCounts = {
            harvester: sources.length * 2, // 2 harvesters per source
            hauler: containers.length > 0 ? 2 : 1, // More haulers if we have containers
            upgrader: 1, // Reduced from 2 to 1
            builder: constructionSites.length > 0 ? 1 : 0, // Only spawn if needed
            repairer: room.find(FIND_STRUCTURES, {
                filter: s => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL
            }).length > 0 ? 1 : 0 // Only spawn if repairs needed
        };
        
        // Get body parts based on available energy
        let getBody = function(role, energy) {
            if (role === 'hauler') {
                if (energy >= 400) return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
                return [CARRY, CARRY, MOVE, MOVE];
            }
            if (energy >= 550) {
                return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
            }
            if (energy >= 400) {
                return [WORK, WORK, CARRY, MOVE, MOVE];
            }
            return [WORK, CARRY, MOVE];
        };
        
        // Spawn priority order
        const spawnOrder = ['harvester', 'hauler', 'upgrader', 'builder', 'repairer'];
        
        // Find first role that needs spawning
        const roleToSpawn = spawnOrder.find(role => counts[role] < desiredCounts[role]);
        
        if (roleToSpawn) {
            const name = roleToSpawn.charAt(0).toUpperCase() + roleToSpawn.slice(1) + Game.time;
            const body = getBody(roleToSpawn, spawn.room.energyAvailable);
            
            spawn.spawnCreep(body, name, {
                memory: {role: roleToSpawn}
            });
        }
        
        // Show spawn status
        if (spawn.spawning) { 
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