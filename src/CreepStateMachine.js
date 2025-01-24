const StateMachine = require('StateMachine');

/**
 * CreepStateMachine manages population control and spawning operations for a room.
 * This implementation combines analysis and spawning into a single operation flow
 * while maintaining fine-grained control over population composition.
 */
class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        // Simplified state system that combines analysis and spawning
        this.states = {
            MANAGE: 'MANAGE',    // Handles both analysis and spawning in one state
            IDLE: 'IDLE'        // No spawn needs currently
        };

        // Initialize memory structures
        this.memory[this.name] = this.memory[this.name] || {};
        this.memory[this.name].populationTargets = this.memory[this.name].populationTargets || {
            harvester: 0,
            builder: 0,
            upgrader: 0
        };

        // Track spawn cooldown to prevent spawn checking every tick
        this.memory[this.name].lastSpawnAttempt = Game.time;
        
        this.setState(this.states.MANAGE);
    }

    /**
     * Main execution loop that combines analysis and spawning into a single flow
     * to minimize state transitions and tick overhead
     */
    run() {
        // Get comprehensive room state
        const roomState = this.analyzeRoomState();
        
        // Update population targets based on current conditions
        this.updatePopulationTargets(roomState);

        // Handle spawning logic if needed
        if (this.shouldAttemptSpawn(roomState)) {
            this.setState(this.states.MANAGE);
            this.handleSpawnLogic(roomState);
        } else {
            this.setState(this.states.IDLE);
        }
    }

    /**
     * Determines if we should attempt spawning based on room conditions
     * and spawn cooldown
     */
    shouldAttemptSpawn(roomState) {
        // Check if we have available spawns
        if (!roomState.spawns.some(spawn => !spawn.spawning)) {
            return false;
        }

        // Check if we need any creeps
        const needsCreeps = this.determineSpawnPriority(roomState) !== null;
        
        // Return true if we need creeps and have energy
        return needsCreeps && roomState.energyAvailable >= 200;
    }

    /**
     * Comprehensive room state analysis
     */
    analyzeRoomState() {
        return {
            energyAvailable: this.room.energyAvailable,
            energyCapacity: this.room.energyCapacityAvailable,
            sources: this.room.find(FIND_SOURCES).length,
            constructionSites: this.room.find(FIND_CONSTRUCTION_SITES).length,
            spawns: this.room.find(FIND_MY_SPAWNS),
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

    /**
     * Updates population targets based on room conditions
     */
    updatePopulationTargets(roomState) {
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
        
        this.memory[this.name].populationTargets = targets;
    }

    /**
     * Determines which creep type should be spawned next
     * Returns role string or null if no spawning needed
     */
    determineSpawnPriority(roomState) {
        const targets = this.memory[this.name].populationTargets;
        const current = roomState.currentPopulation;

        // Check population needs in priority order
        if (current.harvester < targets.harvester) {
            return 'harvester';
        }
        if (current.builder < targets.builder) {
            return 'builder';
        }
        if (current.upgrader < targets.upgrader) {
            return 'upgrader';
        }

        return null;
    }

    /**
     * Handles the main spawning logic flow, integrating spawn priority
     * decisions with actual spawning operations
     */
    handleSpawnLogic(roomState) {
        const spawnPriority = this.determineSpawnPriority(roomState);
        
        if (spawnPriority) {
            this.spawnCreep(spawnPriority, roomState.energyAvailable);
            this.memory[this.name].lastSpawnAttempt = Game.time;
        }
    }

    /**
     * Generates appropriate body parts based on role and available energy.
     * Scales creep capabilities with room energy capacity while maintaining
     * role-specific optimizations.
     */
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

        // Return the most expensive affordable body, or the basic body if nothing is affordable
        return affordableConfigs.length ? affordableConfigs[0][1] : bodies[role][200];
    }

    /**
     * Attempts to spawn a new creep with the specified role.
     * Handles spawn selection, body generation, and creep initialization.
     */
    spawnCreep(role, energyAvailable) {
        // Find an available spawn
        const spawns = this.room.find(FIND_MY_SPAWNS, {
            filter: spawn => !spawn.spawning
        });

        if (spawns.length === 0) return;

        const spawn = spawns[0];
        const body = this.getCreepBody(role, energyAvailable);
        const creepName = role + Game.time;

        // Attempt to spawn the creep
        const result = spawn.spawnCreep(body, creepName, {
            memory: {
                role: role,
                working: false,
                room: this.room.name
            }
        });

        // Log successful spawn attempts
        if (result === OK) {
            console.log(`${this.room.name} spawning new ${role}: ${creepName}`);
        }
    }
}

module.exports = CreepStateMachine;