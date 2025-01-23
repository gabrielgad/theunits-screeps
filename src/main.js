// src/main.js
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleHauler = require('role.hauler');
const roleRepairer = require('role.repairer');
const spawnManager = require('spawn.manager');
const memoryManager = require('memory.manager');

// Role handler mapping
const roleHandlers = {
    harvester: roleHarvester,
    upgrader: roleUpgrader,
    builder: roleBuilder,
    hauler: roleHauler,
    repairer: roleRepairer
};

module.exports.loop = function() {
    // Track CPU usage
    const startCpu = Game.cpu.getUsed();
    
    // Clean up memory
    memoryManager.cleanDeadCreeps();
    
    // Run spawn logic
    spawnManager.run();
    
    // Run creep logic
    for(let name in Game.creeps) {
        const creep = Game.creeps[name];
        const roleHandler = roleHandlers[creep.memory.role];
        
        if(roleHandler) {
            try {
                roleHandler.run(creep);
            } catch(error) {
                console.log(`Error running ${creep.memory.role} ${creep.name}: ${error}`);
            }
        } else {
            console.log(`No handler found for role: ${creep.memory.role}`);
        }
    }
    
    // Log performance metrics every 100 ticks
    if(Game.time % 100 === 0) {
        const endCpu = Game.cpu.getUsed();
        console.log(`CPU usage: ${(endCpu - startCpu).toFixed(2)}`);
        console.log(`Creeps: ${Object.keys(Game.creeps).length}`);
        
        // Log population by role
        const population = {};
        for(let name in Game.creeps) {
            const role = Game.creeps[name].memory.role;
            population[role] = (population[role] || 0) + 1;
        }
        console.log('Population:', JSON.stringify(population));
    }
}