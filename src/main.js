// Main game loop
module.exports.loop = function() {
    // Clear memory of dead creeps
    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
    
    // Get our spawn
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
    
    // Run creep roles
    for(let name in Game.creeps) {
        let creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader(creep);
        }
    }
}

// Harvester role
function roleHarvester(creep) {
    if(creep.store.getFreeCapacity() > 0) {
        let sources = creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
    else {
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if(targets.length > 0) {
            if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
}

// Upgrader role
function roleUpgrader(creep) {
    if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
    }
    if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
    }

    if(creep.memory.upgrading) {
        if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }
    else {
        let sources = creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
}