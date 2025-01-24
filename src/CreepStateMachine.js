const StateMachine = require('StateMachine');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        // Initialize population targets in memory
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            builder: 0,
            upgrader: 0
        };
    }

    run() {
        // Get current room state including population counts
        const roomState = this.analyzeRoomState();
        
        // Update population targets based on current conditions
        this.updatePopulationTargets(roomState);
        
        // Process spawning needs in a single tick
        this.processSpawning(roomState);
    }

    analyzeRoomState() {
        // Create a comprehensive snapshot of the room's current state
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
        // Use a single iteration through Game.creeps to get all population counts
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
        
        // Calculate optimal populations based on room conditions
        targets.harvester = this.calculateHarvesterTarget(roomState);
        targets.builder = this.calculateBuilderTarget(roomState);
        targets.upgrader = this.calculateUpgraderTarget(roomState);
        
        this.memory[this.name].populationTargets = targets;
    }

    calculateHarvesterTarget(roomState) {
        // Base number: 2 harvesters per source
        let target = roomState.sources * 2;
        
        // Adjust based on room level and energy capacity
        if (roomState.roomLevel >= 3) {
            target += Math.floor(roomState.roomLevel * 0.5);
        }
        
        return target;
    }

    calculateBuilderTarget(roomState) {
        // Base calculation accounting for construction needs
        let target = Math.min(
            Math.ceil(roomState.constructionSites / 5),
            Math.floor(roomState.roomLevel * 1.5)
        );
        
        // Ensure at least one builder if there are any construction sites
        return Math.max(roomState.constructionSites > 0 ? 1 : 0, target);
    }

    calculateUpgraderTarget(roomState) {
        // Scale upgraders with room level and energy capacity
        const baseUpgraders = Math.max(1, Math.floor(roomState.roomLevel * 0.7));
        const energyRatio = roomState.energyCapacity / 300; // Scale based on energy capacity
        
        return Math.floor(baseUpgraders * Math.min(energyRatio, 2));
    }

    processSpawning(roomState) {
        // Don't try to spawn if no spawns are available
        if (roomState.availableSpawns.length === 0) {
            return;
        }

        const targets = this.memory[this.name].populationTargets;
        const current = roomState.currentPopulation;
        
        // Define spawn priorities and check them in order
        const spawnPriorities = [
            {
                role: 'harvester',
                needed: targets.harvester > current.harvester,
                priority: 1
            },
            {
                role: 'builder',
                needed: targets.builder > current.builder,
                priority: 2
            },
            {
                role: 'upgrader',
                needed: targets.upgrader > current.upgrader,
                priority: 3
            }
        ];

        // Sort by priority and find the first needed role
        const toSpawn = spawnPriorities
            .filter(p => p.needed)
            .sort((a, b) => a.priority - b.priority)[0];

        if (toSpawn) {
            this.spawnCreep(toSpawn.role, roomState.energyAvailable, roomState.availableSpawns[0]);
        }
    }

    getCreepBody(role, energy) {
        // Progressive body definitions based on available energy
        const bodies = {
            harvester: [
                { cost: 200, body: [WORK, CARRY, MOVE] },
                { cost: 300, body: [WORK, WORK, CARRY, MOVE] },
                { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE] },
                { cost: 500, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }
            ],
            builder: [
                { cost: 200, body: [WORK, CARRY, MOVE] },
                { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
                { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }
            ],
            upgrader: [
                { cost: 200, body: [WORK, CARRY, MOVE] },
                { cost: 300, body: [WORK, CARRY, CARRY, MOVE, MOVE] },
                { cost: 400, body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] }
            ]
        };

        // Find the most expensive body we can afford
        return bodies[role]
            .filter(config => config.cost <= energy)
            .reduce((best, current) => 
                current.cost > best.cost ? current : best, bodies[role][0]).body;
    }

    spawnCreep(role, energyAvailable, spawn) {
        const body = this.getCreepBody(role, energyAvailable);
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