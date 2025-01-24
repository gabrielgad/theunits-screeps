// main.js
const roleHarvester = require('role.harvester');
const spawner = require('spawner');

// Game memory structure
Memory.creeps = Memory.creeps || {};
Memory.rooms = Memory.rooms || {};

module.exports.loop = function() {
    // Cleanup dead creeps
    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
    
    // Run spawn logic
    spawner.run();
    
    // Run creeps
    for(let name in Game.creeps) {
        const creep = Game.creeps[name];
        roleHarvester.run(creep);
    }
};