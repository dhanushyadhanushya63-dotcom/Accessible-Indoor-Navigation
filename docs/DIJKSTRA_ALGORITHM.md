# Dijkstra Indoor Pathfinding Engine

Multi-criteria graph pathfinding algorithm operating in client-side ES6 JavaScript.

## Algorithmic Constraints
- **Avoid Stairs:** Disables edges with `hasStairs: true` or assigns infinite weight.
- **Wheelchair Priority:** Applies 0.95x incentive weight to verified accessible corridors and ramps.
- **Obstacle Exclusion:** Dynamically removes blocked corridor segments from graph traversal.
