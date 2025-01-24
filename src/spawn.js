// spawner.js
module.exports = {
    run: function() {
        const minimumHarvesters = 2;
        const harvesters = _.filter(Game.creeps, (creep) => true);
        
        if(harvesters.length < minimumHarvesters) {
            const newName = 'Harvester' + Game.time;
            Game.spawns['Spawn1'].spawnCreep([WORK,CARRY,MOVE], newName, 
                {memory: {role: 'harvester'}});
        }
    }
};