const StateMachine = require('StateMachine');
const { WorkStates, CreepStates } = require('CreepStates');
const ExecuteActions = require('ExecuteActions');

class JobStateMachine extends StateMachine {
    constructor(room) {
        super('Job_' + room.name);
        this.room = room;
    }

    run() {
        this.clearDeadCreepMemory();
        this.processAllCreeps();
    }

    clearDeadCreepMemory() {
        for(let name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }

    processAllCreeps() {
        for(let name in Game.creeps) {
            const creep = Game.creeps[name];
            if(creep.room.name !== this.room.name) continue;
            
            if(!creep.memory.workState) {
                this.initializeCreepState(creep);
            }
            
            this.updateCreepState(creep);
            ExecuteActions.executeState(creep, creep.memory.workState);
        }
    }

    initializeCreepState(creep) {
        const creepType = creep.memory.role;
        if (CreepStates[creepType]) {
            creep.memory.workState = CreepStates[creepType].initialState;
        }
    }

    updateCreepState(creep) {
        const creepType = creep.memory.role;
        const currentState = creep.memory.workState;
        
        if (!CreepStates[creepType]) return;

        const stateTransition = CreepStates[creepType].transitions[currentState];
        if (stateTransition && stateTransition.condition(creep)) {
            creep.memory.workState = stateTransition.nextState;
        }
    }
}

module.exports = JobStateMachine;