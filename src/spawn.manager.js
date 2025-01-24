// src/spawn.manager.js
module.exports = {
    // Body part configurations based on energy available
    bodyConfigs: {
        harvester: {
            300: [WORK, CARRY, MOVE, MOVE],
            550: [WORK, WORK, WORK, CARRY, MOVE],
            800: [WORK, WORK, WORK, WORK, CARRY, MOVE],
            1000: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE]
        },
        hauler: {
            300: [CARRY, CARRY, MOVE, MOVE],
            400: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
            600: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
            800: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
        },
        upgrader: {
            300: [WORK, CARRY, MOVE, MOVE],
            500: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            800: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
            1000: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]
        },
        builder: {
            300: [WORK, CARRY, MOVE, MOVE],
            450: [WORK, WORK, CARRY, MOVE, MOVE],
            600: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
            800: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]
        },
        repairer: {
            300: [WORK, CARRY, MOVE, MOVE],
            500: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            700: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
        }
    },

    run: function() {
        let spawn = Game.spawns['Spawn1'];
        if (spawn.spawning) {
            this.showSpawnStatus(spawn);
            return;
        }

        // Count existing creeps
        const counts = {
            harvester: _.filter(Game.creeps, creep => creep.memory.role == 'harvester').length,
            hauler: _.filter(Game.creeps, creep => creep.memory.role == 'hauler').length,
            upgrader: _.filter(Game.creeps, creep => creep.memory.role == 'upgrader').length,
            builder: _.filter(Game.creeps, creep => creep.memory.role == 'builder').length,
            repairer: _.filter(Game.creeps, creep => creep.memory.role == 'repairer').length
        };

        // Emergency recovery mode
        const totalCreeps = Object.values(counts).reduce((sum, count) => sum + count, 0);
        if (totalCreeps < 2) {
            this.spawnEmergencyCreep(spawn);
            return;
        }

        // Calculate desired counts
        const desiredCounts = this.calculateDesiredCounts(spawn.room);
        
        // Find role to spawn based on priority
        const spawnOrder = ['harvester', 'hauler', 'upgrader', 'builder', 'repairer'];
        const roleToSpawn = spawnOrder.find(role => counts[role] < desiredCounts[role]);
        
        if (roleToSpawn) {
            this.spawnCreep(spawn, roleToSpawn);
        }
    },

    calculateDesiredCounts: function(room) {
        const sources = room.find(FIND_SOURCES);
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        
        // Check for completed containers near sources
        const containers = room.find(FIND_STRUCTURES, {
            filter: s => {
                if (s.structureType !== STRUCTURE_CONTAINER) return false;
                // Check if container is near a source
                const nearbySource = s.pos.findInRange(FIND_SOURCES, 2);
                return nearbySource.length > 0;
            }
        });
        
        // Find damaged structures
        const damagedStructures = room.find(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax * 0.5 && 
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
        });

        return {
            harvester: sources.length,
            hauler: containers.length > 0 ? Math.max(1, Math.ceil(containers.length * 0.75)) : 0,
            upgrader: room.controller.level <= 2 ? 2 : 1,
            builder: constructionSites.length > 0 ? Math.min(Math.ceil(constructionSites.length / 10), 2) : 0,
            repairer: damagedStructures.length > 0 ? 1 : 0
        };
    },
    getBody: function(role, energy) {
        const configs = this.bodyConfigs[role];
        const validConfigs = Object.entries(configs)
            .filter(([cost]) => Number(cost) <= energy)
            .sort((a, b) => Number(b[0]) - Number(a[0]));
        
        return validConfigs.length > 0 ? validConfigs[0][1] : [WORK, CARRY, MOVE];
    },

    spawnCreep: function(spawn, role) {
        const body = this.getBody(role, spawn.room.energyAvailable);
        const name = role.charAt(0).toUpperCase() + role.slice(1) + Game.time;
        
        const memory = {
            role: role,
            working: false,
            room: spawn.room.name
        };

        // If spawning a harvester, assign it to a source
        if(role === 'harvester') {
            const sourceId = this.getNextHarvesterSource(spawn.room);
            if(sourceId) {
                memory.targetSource = sourceId;
            }
        }

        return spawn.spawnCreep(body, name, { memory: memory });
    },

    getNextHarvesterSource: function(room) {
        const sources = room.find(FIND_SOURCES);
        const harvesters = _.filter(Game.creeps, creep => 
            creep.memory.role === 'harvester' && 
            creep.room.name === room.name
        );

        // Count harvesters per source
        const sourceCount = {};
        harvesters.forEach(harvester => {
            if(harvester.memory.targetSource) {
                sourceCount[harvester.memory.targetSource] = (sourceCount[harvester.memory.targetSource] || 0) + 1;
            }
        });

        // Find source with fewest harvesters
        let bestSource = null;
        let minHarvesters = Infinity;

        sources.forEach(source => {
            const count = sourceCount[source.id] || 0;
            if(count < minHarvesters) {
                minHarvesters = count;
                bestSource = source;
            }
        });

        return bestSource ? bestSource.id : null;
    },

    spawnEmergencyCreep: function(spawn) {
        const name = 'EmergencyHarvester' + Game.time;
        spawn.spawnCreep([WORK, CARRY, MOVE], name, {
            memory: {
                role: 'harvester',
                working: false,
                emergency: true
            }
        });
    },

    showSpawnStatus: function(spawn) {
        if(spawn.spawning) {
            let spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1, 
                spawn.pos.y, 
                {align: 'left', opacity: 0.8}
            );
        }
    }
};