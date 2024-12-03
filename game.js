class Game2048 {
    constructor() {
        this.size = 4;
        this.tileContainer = document.querySelector('.tile-container');
        this.scoreDisplay = document.getElementById('score');
        this.bestDisplay = document.getElementById('best');
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.bestDisplay.textContent = this.bestScore;  // Display best score immediately
        
        this.grid = Array(this.size).fill()
            .map(() => Array(this.size).fill(null));
            
        this.setupNewGame();
        this.setupInputListeners();
    }

    setupNewGame() {
        // Clear the grid and UI
        this.grid = Array(this.size).fill()
            .map(() => Array(this.size).fill(null));
        this.tileContainer.innerHTML = '';
        this.score = 0;
        this.updateScore();
        
        // Add initial tiles
        this.addRandomTile();
        this.addRandomTile();
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestDisplay.textContent = this.bestScore;
            localStorage.setItem('bestScore', this.bestScore);
        }
    }

    setupInputListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.busy) {
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.move('up');
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.move('down');
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.move('left');
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.move('right');
                        break;
                }
            }
        });

        document.getElementById('new-game').addEventListener('click', () => {
            this.setupNewGame();
        });

        // Add touch support
        let touchStartX, touchStartY;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > 10) {
                if (absDx > absDy) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
            }
        }, { passive: true });
    }

    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) {
                    emptyCells.push({row, col});
                }
            }
        }

        if (emptyCells.length) {
            const {row, col} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            this.addTile(row, col, value);
        }
    }

    addTile(row, col, value) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        this.setTilePosition(tile, row, col);
        this.tileContainer.appendChild(tile);

        this.grid[row][col] = {
            value: value,
            element: tile,
            mergedFrom: null
        };
    }

    setTilePosition(element, row, col) {
        // Use 106.25px (tile size) + 15px (gap) for positioning
        element.style.top = (row * (106.25 + 15)) + 'px';
        element.style.left = (col * (106.25 + 15)) + 'px';
    }

    move(direction) {
        if (this.busy) return;
        this.busy = true;

        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);
        let moved = false;

        // Save the current tile positions
        this.prepareTiles();

        // Traverse the grid in the right direction
        traversals.row.forEach(row => {
            traversals.col.forEach(col => {
                const cell = {row, col};
                const tile = this.grid[row][col];

                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = positions.next;

                    // Only one merger per row traversal?
                    if (next && 
                        this.grid[next.row][next.col] &&
                        this.grid[next.row][next.col].value === tile.value &&
                        !this.grid[next.row][next.col].mergedFrom) {
                        
                        const merged = {
                            value: tile.value * 2,
                            element: tile.element,
                            mergedFrom: [tile, this.grid[next.row][next.col]]
                        };

                        // Remove the old tile
                        this.grid[row][col] = null;
                        this.grid[next.row][next.col] = null;
                        
                        // Add the merged tile
                        this.grid[next.row][next.col] = merged;

                        // Update the score
                        this.score += merged.value;

                        // Update the UI
                        this.setTilePosition(merged.element, next.row, next.col);
                        merged.element.textContent = merged.value;
                        merged.element.className = `tile tile-${merged.value} merged`;

                        // Remove the merged tile
                        merged.mergedFrom[1].element.remove();

                        moved = true;
                    } else {
                        const position = positions.farthest;
                        if (position.row !== row || position.col !== col) {
                            // Update the grid
                            this.grid[row][col] = null;
                            this.grid[position.row][position.col] = tile;

                            // Update the UI
                            this.setTilePosition(tile.element, position.row, position.col);
                            moved = true;
                        }
                    }
                }
            });
        });

        if (moved) {
            this.updateScore();
            setTimeout(() => {
                this.addRandomTile();
                if (!this.movesAvailable()) {
                    this.gameOver();
                }
                this.busy = false;
            }, 100);
        } else {
            this.busy = false;
        }
    }

    prepareTiles() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (tile) {
                    tile.mergedFrom = null;
                }
            }
        }
    }

    getVector(direction) {
        const vectors = {
            up:    {row: -1, col: 0},
            right: {row: 0,  col: 1},
            down:  {row: 1,  col: 0},
            left:  {row: 0,  col: -1}
        };
        return vectors[direction];
    }

    buildTraversals(vector) {
        const traversals = {
            row: [],
            col: []
        };

        for (let i = 0; i < this.size; i++) {
            traversals.row.push(i);
            traversals.col.push(i);
        }

        // Always traverse from the farthest cell in the chosen direction
        if (vector.row === 1) traversals.row.reverse();
        if (vector.col === 1) traversals.col.reverse();

        return traversals;
    }

    findFarthestPosition(cell, vector) {
        let previous;
        let current = cell;

        do {
            previous = current;
            current = {
                row: previous.row + vector.row,
                col: previous.col + vector.col
            };
        } while (
            this.withinBounds(current) &&
            !this.grid[current.row][current.col]
        );

        return {
            farthest: previous,
            next: this.withinBounds(current) ? current : null
        };
    }

    withinBounds(position) {
        return position.row >= 0 && position.row < this.size &&
               position.col >= 0 && position.col < this.size;
    }

    movesAvailable() {
        return this.cellsAvailable() || this.matchesAvailable();
    }

    cellsAvailable() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) {
                    return true;
                }
            }
        }
        return false;
    }

    matchesAvailable() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (tile) {
                    // Check all adjacent cells
                    for (const vector of [{row:0, col:1}, {row:1, col:0}]) {
                        const other = {
                            row: row + vector.row,
                            col: col + vector.col
                        };

                        if (this.withinBounds(other)) {
                            const otherTile = this.grid[other.row][other.col];
                            if (otherTile && otherTile.value === tile.value) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    gameOver() {
        setTimeout(() => {
            alert('Game Over! No more moves available.');
        }, 200);
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
