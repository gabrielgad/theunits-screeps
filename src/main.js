// src/main.js
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const spawnManager = require('spawn.manager');
const memoryManager = require('memory.manager');

module.exports.loop = function() {
    // Clean up memory
    memoryManager.cleanDeadCreeps();
    
    // Run spawn logic
    spawnManager.run();
    
    // Run creep logic
    for(let name in Game.creeps) {
        let creep = Game.creeps[name];
        switch(creep.memory.role) {
            case 'harvester':
                roleHarvester.run(creep);
                break;
            case 'upgrader':
                roleUpgrader.run(creep);
                break;
        }
    }
}