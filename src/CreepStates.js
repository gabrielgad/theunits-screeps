const WorkStates = {
    HARVEST: 'HARVEST',
    STORE: 'STORE',
    BUILD: 'BUILD',
    COLLECT: 'COLLECT',
    UPGRADE: 'UPGRADE',
    REPAIR: 'REPAIR'
};

const CreepStates = {
    harvester: {
        states: [WorkStates.HARVEST, WorkStates.STORE],
        initialState: WorkStates.HARVEST,
        transitions: {
            [WorkStates.HARVEST]: {
                nextState: WorkStates.STORE,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.STORE]: {
                nextState: WorkStates.HARVEST,
                condition: (creep) => creep.store[RESOURCE_ENERGY] === 0
            }
        }
    },
    
    builder: {
        states: [WorkStates.COLLECT, WorkStates.BUILD],
        initialState: WorkStates.COLLECT,
        transitions: {
            [WorkStates.COLLECT]: {
                nextState: WorkStates.BUILD,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.BUILD]: {
                nextState: WorkStates.COLLECT,
                condition: (creep) => creep.store[RESOURCE_ENERGY] === 0
            }
        }
    },
    
    upgrader: {
        states: [WorkStates.COLLECT, WorkStates.UPGRADE],
        initialState: WorkStates.COLLECT,
        transitions: {
            [WorkStates.COLLECT]: {
                nextState: WorkStates.UPGRADE,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.UPGRADE]: {
                nextState: WorkStates.COLLECT,
                condition: (creep) => creep.store[RESOURCE_ENERGY] === 0
            }
        }
    },

    repairer: {
        states: [WorkStates.COLLECT, WorkStates.REPAIR],
        initialState: WorkStates.COLLECT,
        transitions: {
            [WorkStates.COLLECT]: {
                nextState: WorkStates.REPAIR,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.REPAIR]: {
                nextState: WorkStates.COLLECT,
                condition: (creep) => creep.store[RESOURCE_ENERGY] === 0
            }
        }
    }
};

module.exports = {
    WorkStates,
    CreepStates
};