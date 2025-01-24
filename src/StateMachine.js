class StateMachine {
    constructor(name) {
        this.name = name;
        this.currentState = null;
        this.stateStartTime = Game.time;
        this.memory = Memory.stateMachines = Memory.stateMachines || {};
        this.memory[this.name] = this.memory[this.name] || {};
    }

    setState(newState) {
        if(this.currentState !== newState) {
            console.log(`${this.name} state changing from ${this.currentState} to ${newState}`);
            this.currentState = newState;
            this.stateStartTime = Game.time;
            this.memory[this.name].state = newState;
        }
    }

    getState() {
        return this.currentState;
    }

    getStateTime() {
        return Game.time - this.stateStartTime;
    }
}

module.exports = StateMachine;