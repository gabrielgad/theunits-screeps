// CreepStateMachine.js
const StateMachine = require('StateMachine');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        // Define our possible states
        this.states = {
            ANALYZE: 'ANALYZE',           // Evaluate creep needs
            SPAWN_HARVESTER: 'SPAWN_HARVESTER',
            SPAWN_BUILDER: 'SPAWN_BUILDER',
            SPAWN_UPGRADER: 'SPAWN_UPGRADER',
            IDLE: 'IDLE'
        };

        // Initialize population targets in memory
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            builder: 0,
            upgrader: 0
        };

        this.setState(this.states.ANALYZE);
    }

    run() {
        // Get current room state
        const roomState = this.analyzeRoomState();

        // Update population targets based on room state
        this.updatePopulationTargets(roomState);

        // Execute current state
        switch(this.getState()) {
            case this.states.ANALYZE:
                this.runAnalyzeState(roomState);
                break;
            case this.states.SPAWN_HARVESTER:
                this.runSpawnHarvesterState(roomState);
                break;
            case this.states.SPAWN_BUILDER:
                this.runSpawnBuilderState(roomState);
                break;
            case this.states.SPAWN_UPGRADER:
                this.runSpawnUpgraderState(roomState);
                break;
            case this.states.IDLE:
                this.runIdleState();
                break;
        }
    }

    analyzeRoomState() {
        // Gather all relevant room information for decision making
        return {
            energyAvailable: this.room.energyAvailable,
            energyCapacity: this.room.energyCapacityAvailable,
            sources: this.room.find(FIND_SOURCES).length,
            constructionSites: this.room.find(FIND_CONSTRUCTION_SITES).length,
            currentPopulation: {
                harvester: _.filter(Game.creeps, creep => 
                    creep.memory.role === 'harvester' && creep.room.name === this.room.name).length,
                builder: _.filter(Game.creeps, creep => 
                    creep.memory.role === 'builder' && creep.room.name === this.room.name).length,
                upgrader: _.filter(Game.creeps, creep => 
                    creep.memory.role === 'upgrader' && creep.room.name === this.room.name).length
            },
            roomLevel: this.room.controller.level
        };
    }

    updatePopulationTargets(roomState) {
        // Calculate desired population based on room state
        const targets = this.memory[this.name].populationTargets;
        
        // Harvesters: 2 per source initially
        targets.harvester = roomState.sources * 2;
        
        // Builders: Based on construction sites and room level
        targets.builder = Math.min(
            Math.ceil(roomState.constructionSites / 5),  // One builder per 5 sites
            Math.floor(roomState.roomLevel * 1.5)        // But cap based on room level
        ) || 1;  // Minimum 1 builder
        
        // Upgraders: Scale with room level
        targets.upgrader = Math.max(1, Math.floor(roomState.roomLevel * 0.7));
        
        // Save updated targets
        this.memory[this.name].populationTargets = targets;
    }

    getCreepBody(role, energy) {
        // Define body part combinations for different energy levels
        const bodies = {
            harvester: {
                200: [WORK, CARRY, MOVE],
                300: [WORK, WORK, CARRY, MOVE],
                400: [WORK, WORK, CARRY, CARRY, MOVE],
                500: [WORK, WORK, CARRY, CARRY, MOVE, MOVE]
            },
            builder: {
                200: [WORK, CARRY, MOVE],
                300: [WORK, CARRY, CARRY, MOVE, MOVE],
                400: [WORK, WORK, CARRY, CARRY, MOVE, MOVE]
            },
            upgrader: {
                200: [WORK, CARRY, MOVE],
                300: [WORK, CARRY, CARRY, MOVE, MOVE],
                400: [WORK, WORK, CARRY, CARRY, MOVE, MOVE]
            }
        };

        // Find the best body we can afford
        const availableBodies = bodies[role];
        const affordableConfigs = Object.entries(availableBodies)
            .filter(([cost]) => Number(cost) <= energy)
            .sort(([a], [b]) => Number(b) - Number(a));

        return affordableConfigs.length ? affordableConfigs[0][1] : bodies[role][200];
    }

    runAnalyzeState(roomState) {
        const targets = this.memory[this.name].populationTargets;
        
        // Check population needs in priority order
        if (roomState.currentPopulation.harvester < targets.harvester) {
            this.setState(this.states.SPAWN_HARVESTER);
            return;
        }
        
        if (roomState.currentPopulation.builder < targets.builder) {
            this.setState(this.states.SPAWN_BUILDER);
            return;
        }
        
        if (roomState.currentPopulation.upgrader < targets.upgrader) {
            this.setState(this.states.SPAWN_UPGRADER);
            return;
        }

        this.setState(this.states.IDLE);
    }

    runSpawnHarvesterState(roomState) {
        this.spawnCreep('harvester', roomState.energyAvailable);
        this.setState(this.states.ANALYZE);
    }

    runSpawnBuilderState(roomState) {
        this.spawnCreep('builder', roomState.energyAvailable);
        this.setState(this.states.ANALYZE);
    }

    runSpawnUpgraderState(roomState) {
        this.spawnCreep('upgrader', roomState.energyAvailable);
        this.setState(this.states.ANALYZE);
    }

    runIdleState() {
        if (this.getStateTime() > 10) {
            this.setState(this.states.ANALYZE);
        }
    }

    spawnCreep(role, energyAvailable) {
        const spawns = this.room.find(FIND_MY_SPAWNS, {
            filter: spawn => !spawn.spawning
        });

        if (spawns.length === 0) return;

        const spawn = spawns[0];
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