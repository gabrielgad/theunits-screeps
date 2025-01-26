const StateMachine = require('StateMachine');
const ControllerTower = require('ControllerTower');
const ControllerFactory = require('ControllerFactory');
const ControllerTerminal = require('ControllerTerminal');

class BuildingExecutiveStateMachine extends StateMachine {
    constructor(room) {
        super('BuildingExec_' + room.name);
        this.room = room;
        
        if (!this.memory[this.name]) {
            this.memory[this.name] = {};
        }
    }

    run() {
        const roomState = this.analyzeRoomState();
        this.executeTowers(roomState);
        this.executeFactories(roomState);
        this.executeTerminals(roomState);
    }

    analyzeRoomState() {
        return {
            room: this.room,
            towers: this.room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_TOWER }
            }),
            factories: this.room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_FACTORY }
            }),
            terminals: this.room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_TERMINAL }
            }),
            hostiles: this.room.find(FIND_HOSTILE_CREEPS),
            damagedStructures: this.room.find(FIND_STRUCTURES, {
                filter: structure => structure.hits < structure.hitsMax
            })
        };
    }

    executeTowers(roomState) {
        if (roomState.towers.length === 0) return;
        
        ControllerTower.execute(roomState);
    }

    executeFactories(roomState) {
        if (roomState.factories.length === 0) return;
        
        ControllerFactory.execute(roomState);
    }

    executeTerminals(roomState) {
        if (roomState.terminals.length === 0) return;
        
        ControllerTerminal.execute(roomState);
    }
}

module.exports = BuildingExecutiveStateMachine;