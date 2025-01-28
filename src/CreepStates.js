const WorkStates = {
    HARVEST: 'HARVEST',
    STORE: 'STORE',
    BUILD: 'BUILD',
    COLLECT: 'COLLECT',
    UPGRADE: 'UPGRADE',
    REPAIR: 'REPAIR',
    PICKUP: 'PICKUP',
    DELIVER: 'DELIVER',
    PATROL: 'PATROL',
    ATTACK: 'ATTACK',
    REMOTE_HARVEST: 'REMOTE_HARVEST',
    REMOTE_DELIVER: 'REMOTE_DELIVER',
    REMOTE_HAUL: 'REMOTE_HAUL',
    RESERVE: 'RESERVE',
    TRAVEL_TO_ROOM: 'TRAVEL_TO_ROOM'
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
    
    hauler: {
        states: [WorkStates.PICKUP, WorkStates.DELIVER],
        initialState: WorkStates.PICKUP,
        transitions: {
            [WorkStates.PICKUP]: {
                nextState: WorkStates.DELIVER,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.DELIVER]: {
                nextState: WorkStates.PICKUP,
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
    },

    melee: {
        states: [WorkStates.PATROL, WorkStates.ATTACK],
        initialState: WorkStates.PATROL,
        transitions: {
            [WorkStates.PATROL]: {
                nextState: WorkStates.ATTACK,
                condition: (creep) => {
                    const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
                    return hostiles.length > 0;
                }
            },
            [WorkStates.ATTACK]: {
                nextState: WorkStates.PATROL,
                condition: (creep) => {
                    const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
                    return hostiles.length === 0;
                }
            }
        }
    },
    
    remoteMiner: {
        states: [WorkStates.TRAVEL_TO_ROOM, WorkStates.REMOTE_HARVEST],
        initialState: WorkStates.TRAVEL_TO_ROOM,
        transitions: {
            [WorkStates.TRAVEL_TO_ROOM]: {
                nextState: WorkStates.REMOTE_HARVEST,
                condition: (creep) => creep.room.name === creep.memory.targetRoom
            },
            [WorkStates.REMOTE_HARVEST]: {
                nextState: WorkStates.TRAVEL_TO_ROOM,
                condition: (creep) => creep.room.name !== creep.memory.targetRoom
            }
        }
    },
    
    remoteHauler: {
        states: [WorkStates.TRAVEL_TO_ROOM, WorkStates.REMOTE_HAUL, WorkStates.REMOTE_DELIVER],
        initialState: WorkStates.TRAVEL_TO_ROOM,
        transitions: {
            [WorkStates.TRAVEL_TO_ROOM]: {
                nextState: WorkStates.REMOTE_HAUL,
                condition: (creep) => creep.room.name === creep.memory.targetRoom && creep.store.getFreeCapacity() > 0
            },
            [WorkStates.REMOTE_HAUL]: {
                nextState: WorkStates.REMOTE_DELIVER,
                condition: (creep) => creep.store.getFreeCapacity() === 0
            },
            [WorkStates.REMOTE_DELIVER]: {
                nextState: WorkStates.TRAVEL_TO_ROOM,
                condition: (creep) => creep.store[RESOURCE_ENERGY] === 0
            }
        }
    },
    
    reserver: {
        states: [WorkStates.TRAVEL_TO_ROOM, WorkStates.RESERVE],
        initialState: WorkStates.TRAVEL_TO_ROOM,
        transitions: {
            [WorkStates.TRAVEL_TO_ROOM]: {
                nextState: WorkStates.RESERVE,
                condition: (creep) => creep.room.name === creep.memory.targetRoom
            },
            [WorkStates.RESERVE]: {
                nextState: WorkStates.TRAVEL_TO_ROOM,
                condition: (creep) => creep.room.name !== creep.memory.targetRoom
            }
        }
    }
};

module.exports = {
    WorkStates,
    CreepStates
};