const StateMachine = require('StateMachine');
const CreepHarvester = require('CreepHarvester');
const CreepBuilder = require('CreepBuilder');
const CreepUpgrader = require('CreepUpgrader');
const CreepRepairer = require('CreepRepairer');
const CreepHauler = require('CreepHauler');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            hauler: 0,
            builder: 0,
            upgrader: 0,
            repairer: 0
        };
    }

    run() {
        const roomState = this.analyzeRoomState();
        this.updatePopulationTargets(roomState);
        this.processSpawning(roomState);
    }

    analyzeRoomState() {
        return {
            room: this.room,
            energyAvailable: this.room.energyAvailable,
            energyCapacity: this.room.energyCapacityAvailable,
            sources: this.room.find(FIND_SOURCES).length,
            constructionSites: this.room.find(FIND_CONSTRUCTION_SITES).length,
            currentPopulation: this.getCurrentPopulation(),
            roomLevel: this.room.controller.level,
            availableSpawns: this.room.find(FIND_MY_SPAWNS, {
                filter: spawn => !spawn.spawning
            })
        };
    }

    getCurrentPopulation() {
        const population = {
            harvester: 0,
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
        targets.builder = CreepBuilder.calculateTarget(roomState);
        targets.upgrader = CreepUpgrader.calculateTarget(roomState);
        targets.repairer = CreepRepairer.calculateTarget(roomState);

        this.memory[this.name].populationTargets = targets;
    }

    processSpawning(roomState) {
        if (roomState.availableSpawns.length === 0) return;

        const targets = this.memory[this.name].populationTargets;
        const current = roomState.currentPopulation;
        
        const creepTypes = {
            harvester: { Class: CreepHarvester, priority: 1 },
            hauler: { Class: CreepHauler, priority: 1 },      // Same priority as harvester since they work together
            builder: { Class: CreepBuilder, priority: 3 },     // Lowered builder priority since haulers are more important
            upgrader: { Class: CreepUpgrader, priority: 4 },   // Adjusted upgrader priority down
            repairer: { Class: CreepRepairer, priority: 3 }    // Kept repairer at same relative priority as builder
        };

        const toSpawn = Object.entries(creepTypes)
            .map(([role, config]) => ({
                role,
                needed: targets[role] > current[role],
                priority: config.priority,
                Class: config.Class
            }))
            .filter(p => p.needed)
            .sort((a, b) => a.priority - b.priority)[0];

        if (toSpawn) {
            this.spawnCreep(toSpawn.role, toSpawn.Class, roomState.energyAvailable, roomState.availableSpawns[0]);
        }
    }

    spawnCreep(role, CreepClass, energyAvailable, spawn) {
        const body = CreepClass.getBody(energyAvailable);
        const name = role + Game.time;

        const result = spawn.spawnCreep(body, name, {
            memory: {
                role: role,
                working: false,
                room: this.room.name
            }
        });

        if (result === OK) {
            console.log(`${this.room.name} spawning new ${role}: ${name}`);
        }
    }
}

module.exports = CreepStateMachine;