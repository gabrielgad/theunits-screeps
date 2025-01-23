// src/defense.manager.js
module.exports = {
    run: function(room) {
        if(!room.memory.defense) {
            room.memory.defense = {
                defcon: 5, // 5 is peaceful, 1 is under attack
                wallHealth: {},
                lastAttack: 0,
                defensivePositions: []
            };
        }

        // Check for hostiles and update defense condition
        this.updateDefcon(room);
        
        // Run appropriate defense protocols based on DEFCON level
        switch(room.memory.defense.defcon) {
            case 1: // Under attack
                this.handleActiveAttack(room);
                break;
            case 2: // Imminent attack
                this.prepareForAttack(room);
                break;
            case 3: // Hostile spotted
                this.handleHostilePresence(room);
                break;
            case 4: // Recent activity
                this.maintainDefenses(room);
                break;
            case 5: // Peaceful
                this.peacetimePreparation(room);
                break;
        }
    },

    updateDefcon: function(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const defenseMemory = room.memory.defense;

        if(hostiles.length > 0) {
            const hostileAttackers = hostiles.filter(creep => 
                creep.getActiveBodyparts(ATTACK) > 0 || 
                creep.getActiveBodyparts(RANGED_ATTACK) > 0
            );

            if(hostileAttackers.length > 0) {
                defenseMemory.defcon = 1;
                defenseMemory.lastAttack = Game.time;
            } else {
                defenseMemory.defcon = 3;
            }
        } else if(Game.time - defenseMemory.lastAttack < 1000) {
            defenseMemory.defcon = 4;
        } else {
            defenseMemory.defcon = 5;
        }
    },

    handleActiveAttack: function(room) {
        // Activate all towers
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        towers.forEach(tower => {
            const target = this.getTowerTarget(tower);
            if(target) {
                tower.attack(target);
            }
        });

        // Trigger emergency spawn of defensive creeps
        if(!room.memory.spawnQueue) room.memory.spawnQueue = [];
        
        const defenders = _.filter(Game.creeps, creep => 
            creep.memory.role === 'defender' && 
            creep.room.name === room.name
        );

        if(defenders.length < 2) {
            room.memory.spawnQueue.unshift({
                role: 'defender',
                body: [TOUGH, MOVE, ATTACK, MOVE, ATTACK, MOVE],
                priority: 1
            });
        }
    },

    getTowerTarget: function(tower) {
        // First priority: Hostile creeps with attack parts
        let target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: creep => 
                creep.getActiveBodyparts(ATTACK) > 0 || 
                creep.getActiveBodyparts(RANGED_ATTACK) > 0
        });
        if(target) return target;

        // Second priority: Any hostile creeps
        target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(target) return target;

        // Third priority: Heal damaged structures
        if(tower.store.energy > tower.store.getCapacity(RESOURCE_ENERGY) * 0.7) {
            target = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.hits < s.hitsMax && 
                           s.structureType !== STRUCTURE_WALL &&
                           s.structureType !== STRUCTURE_RAMPART
            });
        }

        return target;
    },

    prepareForAttack: function(room) {
        // Ensure minimal wall/rampart health
        const barriers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_WALL ||
                        s.structureType === STRUCTURE_RAMPART
        });

        barriers.forEach(barrier => {
            if(barrier.hits < 10000) {
                room.memory.defense.wallHealth[barrier.id] = {
                    priority: 1,
                    targetHits: 10000
                };
            }
        });

        // Plan defensive positions if not already done
        if(room.memory.defense.defensivePositions.length === 0) {
            this.planDefensivePositions(room);
        }
    },

    planDefensivePositions: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if(!spawn) return;

        // Create a ring of defensive positions around spawn
        const positions = [];
        const radius = 5;

        for(let x = -radius; x <= radius; x++) {
            for(let y = -radius; y <= radius; y++) {
                if(Math.abs(x) === radius || Math.abs(y) === radius) {
                    const pos = new RoomPosition(
                        spawn.pos.x + x,
                        spawn.pos.y + y,
                        room.name
                    );
                    if(this.isValidDefensivePosition(pos)) {
                        positions.push({x: pos.x, y: pos.y});
                    }
                }
            }
        }

        room.memory.defense.defensivePositions = positions;

        // Create construction sites for ramparts at defensive positions
        positions.forEach(pos => {
            room.createConstructionSite(pos.x, pos.y, STRUCTURE_RAMPART);
        });
    },

    isValidDefensivePosition: function(pos) {
        const terrain = Game.map.getRoomTerrain(pos.roomName);
        return terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL &&
               pos.x > 2 && pos.x < 47 && pos.y > 2 && pos.y < 47;
    },

    handleHostilePresence: function(room) {
        // Similar to prepareForAttack but with less urgency
        this.prepareForAttack(room);
    },

    maintainDefenses: function(room) {
        // Regular maintenance of defenses
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        towers.forEach(tower => {
            if(tower.store.energy > tower.store.getCapacity(RESOURCE_ENERGY) * 0.8) {
                const target = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                               s.structureType !== STRUCTURE_WALL &&
                               s.structureType !== STRUCTURE_RAMPART
                });
                if(target) {
                    tower.repair(target);
                }
            }
        });
    },

    peacetimePreparation: function(room) {
        // Plan and build defenses during peace
        if(room.controller.level >= 3 && !room.memory.defense.towerPlanned) {
            this.planInitialTower(room);
        }
    },

    planInitialTower: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if(!spawn) return;

        // Find position for first tower
        const pos = this.findTowerPosition(spawn.pos);
        if(pos) {
            room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
            room.memory.defense.towerPlanned = true;
        }
    },

    findTowerPosition: function(spawnPos) {
        const positions = [];
        const radius = 3;

        for(let x = -radius; x <= radius; x++) {
            for(let y = -radius; y <= radius; y++) {
                if(Math.abs(x) === radius || Math.abs(y) === radius) {
                    const pos = new RoomPosition(
                        spawnPos.x + x,
                        spawnPos.y + y,
                        spawnPos.roomName
                    );
                    if(this.isValidDefensivePosition(pos)) {
                        positions.push(pos);
                    }
                }
            }
        }

        // Sort positions by distance to room center
        positions.sort((a, b) => {
            const aDist = Math.abs(a.x - 25) + Math.abs(a.y - 25);
            const bDist = Math.abs(b.x - 25) + Math.abs(b.y - 25);
            return aDist - bDist;
        });

        return positions[0];
    }
};