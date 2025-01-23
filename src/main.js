// src/main.js
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleHauler = require('role.hauler');
const roleRepairer = require('role.repairer');
const spawnManager = require('spawn.manager');
const memoryManager = require('memory.manager');
const structurePlanner = require('structure.planner');
const roadPlanner = require('road.planner');
const constructionManager = require('construction.manager');
const defenseManager = require('defense.manager');
const roleDefender = require('role.defender');
const sourceManager = require('source.manager');

// Role handler mapping
const roleHandlers = {
    harvester: roleHarvester,
    upgrader: roleUpgrader,
    builder: roleBuilder,
    hauler: roleHauler,
    repairer: roleRepairer,
    defender: roleDefender
};

module.exports.loop = function() {
    // Track CPU usage
    const startCpu = Game.cpu.getUsed();
    
    // Clean up memory
    memoryManager.cleanDeadCreeps();
    
    // Run room-level logic
    for(let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if(room.controller && room.controller.my) {
            try {

                // Add source manager
                sourceManager.run(room);
                
                // Run construction manager every tick for build queue processing
                constructionManager.run(room);
                
                // Add defense manager
                defenseManager.run(room);
                
                // Run planning logic less frequently to save CPU
                if(Game.time % 100 === 0) {
                    structurePlanner.run(room);
                    roadPlanner.run(room);
                }

                // Track room development metrics
                if(!room.memory.metrics) {
                    room.memory.metrics = {
                        lastProgressTime: Game.time,
                        lastEnergy: room.energyAvailable,
                        lastLevel: room.controller.level,
                        constructionProgress: {}
                    };
                }

                // Update room metrics
                if(Game.time % 10 === 0) {
                    this.updateRoomMetrics(room);
                }

                // Run emergency protocols if energy is critically low
                if(room.energyAvailable < 300) {
                    this.handleLowEnergy(room);
                }
            } catch(error) {
                console.log(`Error in room management for ${roomName}: ${error}`);
            }
        }
    }
    
    // Run spawn logic
    try {
        spawnManager.run();
    } catch(error) {
        console.log(`Error in spawn management: ${error}`);
    }
    
    // Run creep logic with CPU tracking
    const creepCpu = {};
    for(let name in Game.creeps) {
        const creep = Game.creeps[name];
        const roleHandler = roleHandlers[creep.memory.role];
        
        if(roleHandler) {
            try {
                const startCreepCpu = Game.cpu.getUsed();
                roleHandler.run(creep);
                const creepCpuUsed = Game.cpu.getUsed() - startCreepCpu;
                
                // Track CPU usage by role
                creepCpu[creep.memory.role] = (creepCpu[creep.memory.role] || 0) + creepCpuUsed;
            } catch(error) {
                console.log(`Error running ${creep.memory.role} ${creep.name}: ${error}`);
            }
        }
    }
    
    // Log detailed statistics every 100 ticks
    if(Game.time % 100 === 0) {
        this.logDetailedStats(creepCpu, startCpu);
    }
};

// Helper functions
module.exports.updateRoomMetrics = function(room) {
    const metrics = room.memory.metrics;
    
    // Track construction progress
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    sites.forEach(site => {
        if(!metrics.constructionProgress[site.id]) {
            metrics.constructionProgress[site.id] = {
                type: site.structureType,
                startProgress: site.progress,
                lastProgress: site.progress,
                stuckTime: 0
            };
        }
        
        const siteMetrics = metrics.constructionProgress[site.id];
        if(site.progress === siteMetrics.lastProgress) {
            siteMetrics.stuckTime++;
        } else {
            siteMetrics.stuckTime = 0;
        }
        siteMetrics.lastProgress = site.progress;
    });

    // Clean up completed/removed construction sites
    for(let siteId in metrics.constructionProgress) {
        if(!Game.constructionSites[siteId]) {
            delete metrics.constructionProgress[siteId];
        }
    }
    
    // Update general metrics
    metrics.lastEnergy = room.energyAvailable;
    metrics.lastLevel = room.controller.level;
};

module.exports.handleLowEnergy = function(room) {
    // Activate emergency protocols
    room.memory.emergencyMode = true;
    
    // Find all energy sources in the room
    const sources = room.find(FIND_SOURCES);
    const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY
    });
    
    // Reassign idle creeps to energy collection
    const idleCreeps = room.find(FIND_MY_CREEPS, {
        filter: creep => 
            (creep.memory.role === 'builder' || creep.memory.role === 'upgrader') &&
            creep.store.getFreeCapacity() > 0
    });
    
    idleCreeps.forEach(creep => {
        creep.memory.emergencyHarvesting = true;
    });
};

module.exports.logDetailedStats = function(creepCpu, startCpu) {
    const endCpu = Game.cpu.getUsed();
    console.log(`=== Colony Status Report ===`);
    console.log(`Total CPU usage: ${(endCpu - startCpu).toFixed(2)}`);
    
    // CPU usage by role
    console.log('\nCPU usage by role:');
    for(let role in creepCpu) {
        console.log(`${role}: ${creepCpu[role].toFixed(2)}`);
    }

    // Population statistics
    const population = {};
    for(let name in Game.creeps) {
        const role = Game.creeps[name].memory.role;
        population[role] = (population[role] || 0) + 1;
    }
    console.log('\nPopulation:', JSON.stringify(population));

    // Room statistics
    console.log('\nRoom Status:');
    for(let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if(room.controller && room.controller.my) {
            console.log(`\nRoom ${roomName}:`);
            console.log(`- Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);
            console.log(`- Controller: Level ${room.controller.level} (${room.controller.progress}/${room.controller.progressTotal})`);
            console.log(`- Construction sites: ${room.find(FIND_CONSTRUCTION_SITES).length}`);
            
            // Construction progress
            const sites = room.find(FIND_CONSTRUCTION_SITES);
            if(sites.length > 0) {
                console.log('\nConstruction Progress:');
                sites.forEach(site => {
                    console.log(`- ${site.structureType}: ${site.progress}/${site.progressTotal} (${Math.round(site.progress/site.progressTotal * 100)}%)`);
                });
            }
            
            // Stuck construction sites
            const metrics = room.memory.metrics || {};
            const constructionProgress = metrics.constructionProgress || {};
            const stuckSites = Object.entries(constructionProgress)
                .filter(([, data]) => data.stuckTime > 50);
            
            if(stuckSites.length > 0) {
                console.log('\nStuck Construction:');
                stuckSites.forEach(([siteId, data]) => {
                    console.log(`- ${data.type}: Stuck for ${data.stuckTime} ticks`);
                });
            }
        }
    }
};