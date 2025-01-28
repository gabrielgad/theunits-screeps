const StateMachine = require('StateMachine');
const CreepHarvester = require('CreepHarvester');
const CreepBuilder = require('CreepBuilder');
const CreepUpgrader = require('CreepUpgrader');
const CreepRepairer = require('CreepRepairer');
const CreepHauler = require('CreepHauler');
const CreepMelee = require('CreepMelee');
const CreepScout = require('CreepScout');
const CreepRemoteMiner = require('CreepRemoteMiner');
const CreepRemoteHauler = require('CreepRemoteHauler');
const RemoteMiningStateMachine = require('RemoteMiningStateMachine');

class CreepStateMachine extends StateMachine {
    constructor(room) {
        super('Creep_' + room.name);
        this.room = room;
        
        // Initialize memory structure
        if (!Memory.stateMachines) Memory.stateMachines = {};
        if (!Memory.stateMachines[this.name]) {
            Memory.stateMachines[this.name] = {
                populationTargets: {
                    harvester: 0,
                    hauler: 0,
                    builder: 0,
                    upgrader: 0,
                    repairer: 0,
                    melee: 0,
                    scout: 0,
                    remoteMiner: 0,
                    remoteHauler: 0
                }
            };
        }
        
        this.memory = Memory.stateMachines[this.name];
        this.remoteMining = new RemoteMiningStateMachine(room);
    }

    analyzeRoomState() {
        const allSpawns = this.room.find(FIND_MY_SPAWNS);
        const roomsNeedingScout = this.remoteMining.getRoomsNeedingScout();
        const profitableRooms = this.remoteMining.getProfitableRooms();
        
        // Check if remote mining is active without optional chaining
        const isRemoteMiningActive = this.room.memory.remoteMining 
            ? this.room.memory.remoteMining.active 
            : false;
        
        return {
            room: this.room,
            energyAvailable: this.room.energyAvailable,
            energyCapacityAvailable: this.room.energyCapacityAvailable,
            sources: this.room.find(FIND_SOURCES).length,
            constructionSites: this.room.find(FIND_CONSTRUCTION_SITES).length,
            currentPopulation: this.getCurrentPopulation(),
            roomLevel: this.room.controller.level,
            availableSpawns: allSpawns.filter(spawn => !spawn.spawning),
            roomsNeedingScout: roomsNeedingScout,
            profitableRooms: profitableRooms,
            remoteMiningActive: isRemoteMiningActive
        };
    }

    getCurrentPopulation() {
        const population = {
            harvester: 0,
            melee: 0,
            hauler: 0,
            builder: 0,
            upgrader: 0,
            repairer: 0,
            scout: 0,
            remoteMiner: 0,
            remoteHauler: 0
        };

        for (let name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.homeRoom === this.room.name && creep.memory.role in population) {
                population[creep.memory.role]++;
            }
        }
        
        return population;
    }

    updatePopulationTargets(roomState) {
        const targets = {
            harvester: CreepHarvester.calculateTarget(roomState),
            hauler: CreepHauler.calculateTarget(roomState),
            melee: CreepMelee.calculateTarget(roomState),
            builder: CreepBuilder.calculateTarget(roomState),
            upgrader: CreepUpgrader.calculateTarget(roomState),
            repairer: CreepRepairer.calculateTarget(roomState),
            scout: CreepScout.calculateTarget(roomState),
            remoteMiner: CreepRemoteMiner.calculateTarget(roomState),
            remoteHauler: CreepRemoteHauler.calculateTarget(roomState)
        };

        this.memory.populationTargets = targets;
    }

    processSpawning(roomState) {
        console.log('Current population:', JSON.stringify(roomState.currentPopulation));
        console.log('Target population:', JSON.stringify(this.memory.populationTargets));
    
        const targets = this.memory.populationTargets;
        const current = roomState.currentPopulation;
        
        const creepTypes = {
            harvester: { Class: CreepHarvester, priority: 1 },
            hauler: { Class: CreepHauler, priority: 1 },
            melee: { Class: CreepMelee, priority: 2 },
            builder: { Class: CreepBuilder, priority: 3 },
            upgrader: { Class: CreepUpgrader, priority: 4 },
            repairer: { Class: CreepRepairer, priority: 3 },
            scout: { Class: CreepScout, priority: 2 },
            remoteMiner: { Class: CreepRemoteMiner, priority: 2 },
            remoteHauler: { Class: CreepRemoteHauler, priority: 2 }
        };
    
        const toSpawn = Object.entries(creepTypes)
            .map(([role, config]) => ({
                role,
                needed: targets[role] > current[role],
                priority: config.priority,
                Class: config.Class
            }))
            .filter(p => p.needed);
        
        if (toSpawn.length > 0 && roomState.availableSpawns.length > 0) {
            const selectedCreep = toSpawn.sort((a, b) => a.priority - b.priority)[0];
            const spawn = roomState.availableSpawns[0];
            const body = selectedCreep.Class.getBody(roomState.energyAvailable);
            const name = selectedCreep.role + Game.time;
            
            let memory = {
                role: selectedCreep.role.toLowerCase(),
                working: false,
                homeRoom: this.room.name
            };

            // Assign target room for remote creeps
            if (selectedCreep.role === 'scout' && roomState.roomsNeedingScout.length > 0) {
                memory.targetRoom = roomState.roomsNeedingScout[0];
            } else if ((selectedCreep.role === 'remoteMiner' || selectedCreep.role === 'remoteHauler') 
                && roomState.profitableRooms.length > 0) {
                memory.targetRoom = roomState.profitableRooms[0];
            }
            
            const result = spawn.spawnCreep(body, name, { memory });
            console.log('Spawn result:', result);
        }
    }

    run() {
        const roomState = this.analyzeRoomState();
        this.updatePopulationTargets(roomState);
        this.processSpawning(roomState);
    }
}

module.exports = CreepStateMachine;