const StateMachine = require('StateMachine');
const HarvesterCreep = require('HarvesterCreep');
const BuilderCreep = require('BuilderCreep');
const UpgraderCreep = require('UpgraderCreep');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            builder: 0,
            upgrader: 0
        };
    }

    run() {
        const roomState = this.analyzeRoomState();
        this.updatePopulationTargets(roomState);
        this.processSpawning(roomState);
    }

    analyzeRoomState() {
        return {
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
            builder: 0,
            upgrader: 0
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
        
        targets.harvester = HarvesterCreep.calculateTarget(roomState);
        targets.builder = BuilderCreep.calculateTarget(roomState);
        targets.upgrader = UpgraderCreep.calculateTarget(roomState);
        
        this.memory[this.name].populationTargets = targets;
    }

    processSpawning(roomState) {
        if (roomState.availableSpawns.length === 0) return;

        const targets = this.memory[this.name].populationTargets;
        const current = roomState.currentPopulation;
        
        const creepTypes = {
            harvester: { Class: HarvesterCreep, priority: 1 },
            builder: { Class: BuilderCreep, priority: 2 },
            upgrader: { Class: UpgraderCreep, priority: 3 }
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