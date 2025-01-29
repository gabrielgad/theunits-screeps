class PlannerTower {
    constructor(room) {
        this.room = room;
        this.terrain = room.getTerrain();
        
        // Initialize memory for tower planner
        if (!Memory.towerPlanner) Memory.towerPlanner = {};
        if (!Memory.towerPlanner[room.name]) Memory.towerPlanner[room.name] = {
            plannedPositions: []
        };
    }

    needsTowers(rcl) {
        const towers = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        });
        
        const towerSites = this.room.find(FIND_CONSTRUCTION_SITES, {
            filter: { structureType: STRUCTURE_TOWER }
        });
        
        // Keep tower limits per RCL
        const towerLimits = {
            3: 1,
            4: 1,
            5: 2,
            6: 2,
            7: 3,
            8: 6
        };
        
        return rcl >= 3 && (towers.length + towerSites.length) < (towerLimits[rcl] || 0);
    }

    planPositions() {
        const spawn = this.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return [];

        const positions = [];
        const existingTowers = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        }).map(t => `${t.pos.x},${t.pos.y}`);

        // Try to find strategic positions for towers
        const potentialPos = this.findStrategicPositions(spawn);
        
        for (let pos of potentialPos) {
            if (this.canBuildTowerAt(pos) && !existingTowers.includes(`${pos.x},${pos.y}`)) {
                if (!Memory.towerPlanner[this.room.name].plannedPositions.includes(`${pos.x},${pos.y}`)) {
                    Memory.towerPlanner[this.room.name].plannedPositions.push(`${pos.x},${pos.y}`);
                    positions.push(pos);
                    break;  // Only return one position at a time
                }
            }
        }

        return positions;
    }

    findStrategicPositions(spawn) {
        const positions = [];
        const maxRadius = 10; // Increased radius for better coverage
        
        // First priority: Cardinal directions from spawn at various distances
        const cardinalDistances = [3, 5, 7];
        const cardinalDirections = [
            [0, -1],  // North
            [1, 0],   // East
            [0, 1],   // South
            [-1, 0]   // West
        ];

        // Add cardinal positions
        for (let dist of cardinalDistances) {
            for (let [dx, dy] of cardinalDirections) {
                positions.push(new RoomPosition(
                    spawn.pos.x + (dx * dist),
                    spawn.pos.y + (dy * dist),
                    this.room.name
                ));
            }
        }

        // Second priority: Corner positions for better coverage
        const cornerDistances = [4, 6];
        const cornerDirections = [
            [-1, -1], // NW
            [1, -1],  // NE
            [1, 1],   // SE
            [-1, 1]   // SW
        ];

        // Add corner positions
        for (let dist of cornerDistances) {
            for (let [dx, dy] of cornerDirections) {
                positions.push(new RoomPosition(
                    spawn.pos.x + (dx * dist),
                    spawn.pos.y + (dy * dist),
                    this.room.name
                ));
            }
        }

        // Third priority: Extended range positions
        for (let radius = 3; radius <= maxRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only add positions at the current radius
                    if (Math.abs(dx) + Math.abs(dy) === radius) {
                        positions.push(new RoomPosition(
                            spawn.pos.x + dx,
                            spawn.pos.y + dy,
                            this.room.name
                        ));
                    }
                }
            }
        }

        return positions;
    }

    canBuildTowerAt(pos) {
        // Check bounds
        if (pos.x < 2 || pos.x > 47 || pos.y < 2 || pos.y > 47) return false;

        // Check terrain
        if (this.terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

        // Check for existing structures and construction sites
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (structures.length > 0 || sites.length > 0) return false;

        // Check for minimum distance from other towers (for better coverage)
        const nearbyTowers = this.room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        });

        for (let tower of nearbyTowers) {
            const distance = pos.getRangeTo(tower);
            if (distance < 5) { // Minimum 5 tiles between towers
                return false;
            }
        }

        // Additional strategic checks
        let nearbyWalls = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (this.terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    nearbyWalls++;
                }
            }
        }

        // Avoid positions with too many nearby walls
        if (nearbyWalls > 4) return false;

        return true;
    }
}

module.exports = PlannerTower;