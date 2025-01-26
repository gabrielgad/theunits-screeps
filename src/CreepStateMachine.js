const StateMachine = require('StateMachine');
const CreepHarvester = require('CreepHarvester');
const CreepBuilder = require('CreepBuilder');
const CreepUpgrader = require('CreepUpgrader');
const CreepRepairer = require('CreepRepairer');
const CreepHauler = require('CreepHauler');
const CreepMelee = require('CreepMelee');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        if (!this.memory[this.name]) {
            this.memory[this.name] = {};
        }
        
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            hauler: 0,
            builder: 0,
            upgrader: 0,
            repairer: 0,
            melee: 0
        };
    }

    run() {
        const roomState = this.analyzeRoomState();
        this.updatePopulationTargets(roomState);
        this.processSpawning(roomState);
    }

    analyzeRoomState() {
        const allSpawns = this.room.find(FIND_MY_SPAWNS);
        
        return {
            room: this.room,
            energyAvailable: this.room.energyAvailable,
            energyCapacity: this.room.energyCapacityAvailable,
            sources: this.room.find(FIND_SOURCES).length,
            constructionSites: this.room.find(FIND_CONSTRUCTION_SITES).length,
            currentPopulation: this.getCurrentPopulation(),
            roomLevel: this.room.controller.level,
            availableSpawns: allSpawns.filter(spawn => !spawn.spawning)
        };
    }

    getCurrentPopulation() {
        const population = {
            harvester: 0,
            melee: 0,
            hauler: 0,
            builder: 0,
            upgrader: 0,
            repairer: 0
        };

        for (let name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.room.name === this.room.name && creep.memory.role in population) {
                population[creep.memory.role]++;
            }
        }
        
        return population;
    }

    updatePopulationTargets(roomState) {
        const targets = this.memory[this.name].populationTargets;
        
        targets.harvester = CreepHarvester.calculateTarget(roomState);
        targets.hauler = CreepHauler.calculateTarget(roomState);
        targets.melee = CreepMelee.calculateTarget(roomState);
        targets.builder = CreepBuilder.calculateTarget(roomState);
        targets.upgrader = CreepUpgrader.calculateTarget(roomState);
        targets.repairer = CreepRepairer.calculateTarget(roomState);

        this.memory[this.name].populationTargets = targets;
    }

    processSpawning(roomState) {
        console.log('Current population:', JSON.stringify(roomState.currentPopulation));
        console.log('Target population:', JSON.stringify(this.memory[this.name].populationTargets));
    
        const targets = this.memory[this.name].populationTargets;
        const current = roomState.currentPopulation;
        
        const creepTypes = {
            harvester: { Class: CreepHarvester, priority: 1 },
            hauler: { Class: CreepHauler, priority: 1 },
            melee: { Class: CreepMelee, priority: 2 },
            builder: { Class: CreepBuilder, priority: 3 },
            upgrader: { Class: CreepUpgrader, priority: 4 },
            repairer: { Class: CreepRepairer, priority: 3 }
        };
    
        const toSpawn = Object.entries(creepTypes)
            .map(([role, config]) => ({
                role,
                needed: targets[role] > current[role],
                priority: config.priority,
                Class: config.Class
            }))
            .filter(p => p.needed);
        
        console.log('Creeps needed:', JSON.stringify(toSpawn));
    
        if (toSpawn.length > 0 && roomState.availableSpawns.length > 0) {
            const selectedCreep = toSpawn.sort((a, b) => a.priority - b.priority)[0];
            console.log('Selected to spawn:', selectedCreep.role);
            
            const spawn = roomState.availableSpawns[0];
            const body = selectedCreep.Class.getBody(roomState.energyAvailable);
            const name = selectedCreep.role + Game.time;
            
            console.log('Attempting to spawn with body:', JSON.stringify(body));
            
            const result = spawn.spawnCreep(body, name, {
                memory: {
                    role: selectedCreep.role,
                    working: false,
                    room: this.room.name
                }
            });
    
            console.log('Spawn result:', result);
        } else {
            console.log('No creeps needed or no spawns available');
        }
    }
}

module.exports = CreepStateMachine;