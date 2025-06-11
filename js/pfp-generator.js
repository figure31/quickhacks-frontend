/**
 * PFP (Profile Picture) Generation System
 * Generates procedural cyberpunk-style glyphs using p5.js
 * QuickHacks Game Frontend Module
 */

// PFP System Variables
let pfpSketch = null;
// Make pfpSketch globally accessible for cleanup
window.pfpSketch = pfpSketch;
// Generate random seed on page load
let seedNumber = Math.floor(Math.random() * 900000) + 100000; // 6-digit
let colorLetter = 'W'; // Always use white
let currentPFPSeed = `${seedNumber}-0-${colorLetter}`;
let currentPFPRotation = 0;

/**
 * Initialize the PFP generation system
 * Creates a p5.js canvas and sets up the glyph generation
 */
function initializePFP() {
    // Prevent multiple canvas creation
    if (pfpSketch && typeof pfpSketch.remove === 'function') {
        pfpSketch.remove();
    }
    pfpSketch = null;
    window.pfpSketch = null;
    
    pfpSketch = function(p) {
        let currentGlyph;
        let glyphSize = 280;
        let rotation = 0;
        let currentSeed = currentPFPSeed;

        p.setup = function() {
            // blob-animation is 48vh, header is 41px
            let totalHeight = window.innerHeight * 0.48;
            let headerHeight = 41;
            let availableHeight = totalHeight - headerHeight;
            let availableWidth = window.innerWidth * 0.25;
            
            // Use 80% of the smaller dimension
            let size = Math.min(availableHeight * 0.8, availableWidth * 0.8);
            size = Math.max(size, 200);
            
            let canvas = p.createCanvas(size, size);
            canvas.parent('pfpContainer');
            
            // Calculate exact center position with manual adjustment
            let topOffset = (availableHeight - size) / 2;
            let adjustment = window.innerHeight * 0.0155; // 1.55vh upward adjustment
            topOffset -= adjustment;
            
            canvas.style('position', 'absolute');
            canvas.style('top', topOffset + 'px');
            canvas.style('left', '50%');
            canvas.style('transform', 'translateX(-50%)');
            
            p.background('#171a1d');
            p.noStroke();
            generatePFPGlyph();
        }
        
        p.windowResized = function() {
            let totalHeight = window.innerHeight * 0.48;
            let headerHeight = 41;
            let availableHeight = totalHeight - headerHeight;
            let availableWidth = window.innerWidth * 0.25;
            
            let size = Math.min(availableHeight * 0.8, availableWidth * 0.8);
            size = Math.max(size, 200);
            
            p.resizeCanvas(size, size);
            
            // Recalculate position with adjustment
            let topOffset = (availableHeight - size) / 2;
            let adjustment = window.innerHeight * 0.0155; // 1.55vh upward adjustment
            topOffset -= adjustment;
            p.canvas.style.top = topOffset + 'px';
            
            p.background('#171a1d');
            generatePFPGlyph();
        }

        p.draw = function() {
            p.background('#171a1d');
            
            if (currentGlyph) {
                p.push();
                p.translate(p.width/2, p.height/2);
                p.rotate(rotation);
                p.translate(-p.width/2, -p.height/2);
                currentGlyph.draw(p);
                p.pop();
                
                let rotationDegrees = Math.round((rotation * 180) / p.PI) % 360;
                document.getElementById('seedDisplay').textContent = currentPFPSeed;
            }
        }

        function generatePFPGlyph(seed = null, rotationParam = null) {
            if (seed !== null) {
                currentSeed = seed;
                p.randomSeed(seed);
            } else if (currentSeed) {
                p.randomSeed(currentSeed);
            }
            
            let x = p.width / 2;
            let y = p.height / 2;
            // Scale glyph size relative to canvas size
            let scaledGlyphSize = Math.min(p.width, p.height) * 0.85;
            currentGlyph = new StructuredGlyphColored(x, y, scaledGlyphSize, p);
            
            if (rotationParam !== null) {
                rotation = (rotationParam * p.PI) / 180;
                currentPFPRotation = rotationParam;
            } else {
                rotation = (currentPFPRotation * p.PI) / 180;
            }
        }

        window.generatePFPGlyph = generatePFPGlyph;
        window.rotatePFPGlyph = function() {
            currentPFPRotation += 90;
            if (currentPFPRotation >= 360) currentPFPRotation = 0;
            rotation = (currentPFPRotation * p.PI) / 180;
        };

        // StructuredGlyphColored class
        class StructuredGlyphColored {
            constructor(x, y, size, p5instance) {
                this.x = x;
                this.y = y;
                this.size = size;
                this.p = p5instance;
                this.patternInfo = "";
                this.grid = this.generateSymmetricPattern();
                // Scale cell size based on glyph size - round to whole numbers to prevent gaps
                this.cellSize = Math.max(8, Math.floor(size / 25)); // 25x25 grid, minimum 8px cells
                this.colorGrid = this.generateColorMapping();
            }
            
            generateSymmetricPattern() {
                let gridSize = 25;
                let grid = [];
                
                for (let i = 0; i < gridSize; i++) {
                    grid[i] = [];
                    for (let j = 0; j < gridSize; j++) {
                        grid[i][j] = false;
                    }
                }
                
                let center = Math.floor(gridSize / 2);
                
                let preferredCombinations = [
                    [{type: 7, name: "Mandala"}, {type: 2, name: "Bilateral"}],
                    [{type: 2, name: "Bilateral"}],
                    [{type: 8, name: "Simple Dots"}]
                ];
                
                let selectedCombination = this.p.random(preferredCombinations);
                
                for (let i = 0; i < selectedCombination.length; i++) {
                    let pattern = selectedCombination[i];
                    
                    if (this.patternInfo === "") {
                        this.patternInfo = pattern.name;
                    } else {
                        this.patternInfo += " + " + pattern.name;
                    }
                    
                    switch(pattern.type) {
                        case 2:
                            this.generateBilateralSymmetry(grid, gridSize, center);
                            break;
                        case 7:
                            this.generateMandalaPattern(grid, gridSize, center);
                            break;
                        case 8:
                            this.generateSimpleDots(grid, gridSize, center);
                            break;
                    }
                }
                
                return grid;
            }
            
            generateColorMapping() {
                let gridSize = this.grid.length;
                let colorGrid = [];
                
                // Extract color from seed format (seed-rotation-color)
                let seedParts = currentPFPSeed.toString().split('-');
                let colorLetter = seedParts[2] || 'W'; // Default to White if no color
                
                let chosenColor;
                switch(colorLetter) {
                    case 'W': chosenColor = 'base'; break;
                    case 'P': chosenColor = 'purple'; break;
                    case 'R': chosenColor = 'red'; break;
                    default: chosenColor = 'base';
                }
                
                this.dominantColor = chosenColor; // Store for map visualization
                
                for (let i = 0; i < gridSize; i++) {
                    colorGrid[i] = [];
                    for (let j = 0; j < gridSize; j++) {
                        colorGrid[i][j] = this.grid[i][j] ? chosenColor : 'none';
                    }
                }
                
                return colorGrid;
            }
            
            getDominantColor() {
                // Return the actual color values used in map
                switch(this.dominantColor) {
                    case 'purple': return '#875fff';
                    case 'red': return '#d42d17';
                    case 'base': return '#d9d8eb';
                    default: return '#d9d8eb';
                }
            }
            
            generateBilateralSymmetry(grid, size, center) {
                let symmetryType = Math.floor(this.p.random(2));
                let density = this.p.random(0.15, 0.35);
                
                if (symmetryType === 0) {
                    for (let i = 0; i < center; i++) {
                        for (let j = 0; j < size; j++) {
                            if (this.p.random() < density) {
                                grid[i][j] = true;
                                grid[size - 1 - i][j] = true;
                            }
                        }
                    }
                } else {
                    for (let i = 0; i < size; i++) {
                        for (let j = 0; j < center; j++) {
                            if (this.p.random() < density) {
                                grid[i][j] = true;
                                grid[i][size - 1 - j] = true;
                            }
                        }
                    }
                }
            }
            
            generateMandalaPattern(grid, size, center) {
                let density = this.p.random(0.2, 0.4);
                let rings = Math.floor(this.p.random(3, 7));
                
                for (let ring = 1; ring <= rings; ring++) {
                    let radius = (ring / rings) * (center - 2);
                    let circumference = 2 * this.p.PI * radius;
                    let pointsOnRing = Math.max(8, Math.floor(circumference / 3));
                    
                    for (let point = 0; point < pointsOnRing; point++) {
                        if (this.p.random() < density) {
                            let angle = (point / pointsOnRing) * 2 * this.p.PI;
                            let x = center + radius * Math.cos(angle);
                            let y = center + radius * Math.sin(angle);
                            
                            let gridX = Math.round(x);
                            let gridY = Math.round(y);
                            
                            if (gridX >= 0 && gridX < size && gridY >= 0 && gridY < size) {
                                grid[gridX][gridY] = true;
                                
                                for (let fold = 0; fold < 4; fold++) {
                                    let newX, newY;
                                    
                                    switch(fold) {
                                        case 0:
                                            newX = gridX;
                                            newY = gridY;
                                            break;
                                        case 1:
                                            newX = size - 1 - gridX;
                                            newY = gridY;
                                            break;
                                        case 2:
                                            newX = gridX;
                                            newY = size - 1 - gridY;
                                            break;
                                        case 3:
                                            newX = size - 1 - gridX;
                                            newY = size - 1 - gridY;
                                            break;
                                    }
                                    
                                    if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
                                        grid[newX][newY] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            generateSimpleDots(grid, size, center) {
                let density = this.p.random(0.08, 0.15);
                let clusterCount = Math.floor(this.p.random(3, 8));
                
                for (let cluster = 0; cluster < clusterCount; cluster++) {
                    let clusterCenterX = Math.floor(this.p.random(2, size - 2));
                    let clusterCenterY = Math.floor(this.p.random(2, size - 2));
                    let clusterRadius = this.p.random(2, 5);
                    
                    for (let i = 0; i < size; i++) {
                        for (let j = 0; j < size; j++) {
                            let distance = Math.sqrt((i - clusterCenterX) ** 2 + (j - clusterCenterY) ** 2);
                            
                            if (distance <= clusterRadius && this.p.random() < density) {
                                grid[i][j] = true;
                                
                                for (let fold = 0; fold < 8; fold++) {
                                    let newX, newY;
                                    
                                    switch(fold) {
                                        case 0:
                                            newX = i;
                                            newY = j;
                                            break;
                                        case 1:
                                            newX = size - 1 - i;
                                            newY = j;
                                            break;
                                        case 2:
                                            newX = i;
                                            newY = size - 1 - j;
                                            break;
                                        case 3:
                                            newX = size - 1 - i;
                                            newY = size - 1 - j;
                                            break;
                                        case 4:
                                            newX = j;
                                            newY = i;
                                            break;
                                        case 5:
                                            newX = size - 1 - j;
                                            newY = i;
                                            break;
                                        case 6:
                                            newX = j;
                                            newY = size - 1 - i;
                                            break;
                                        case 7:
                                            newX = size - 1 - j;
                                            newY = size - 1 - i;
                                            break;
                                    }
                                    
                                    if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
                                        grid[newX][newY] = true;
                                        
                                        let mirrorX = size - 1 - newX;
                                        let mirrorY = size - 1 - newY;
                                        
                                        if (mirrorX >= 0 && mirrorX < size && mirrorY >= 0 && mirrorY < size) {
                                            grid[mirrorX][mirrorY] = true;
                                            
                                            for (let additionalFold = 0; additionalFold < 4; additionalFold++) {
                                                let newMirrorX, newMirrorY;
                                                
                                                switch(additionalFold) {
                                                    case 0:
                                                        newMirrorX = mirrorX;
                                                        newMirrorY = mirrorY;
                                                        break;
                                                    case 1:
                                                        newMirrorX = size - 1 - mirrorX;
                                                        newMirrorY = mirrorY;
                                                        break;
                                                    case 2:
                                                        newMirrorX = mirrorX;
                                                        newMirrorY = size - 1 - mirrorY;
                                                        break;
                                                    case 3:
                                                        newMirrorX = size - 1 - mirrorX;
                                                        newMirrorY = size - 1 - mirrorY;
                                                        break;
                                                }
                                                
                                                if (newMirrorX >= 0 && newMirrorX < size && newMirrorY >= 0 && newMirrorY < size) {
                                                    grid[newMirrorX][newMirrorY] = true;
                                                    
                                                    for (let finalFold = 0; finalFold < 2; finalFold++) {
                                                        let finalX, finalY;
                                                        
                                                        if (finalFold === 0) {
                                                            finalX = newMirrorY;
                                                            finalY = newMirrorX;
                                                        } else {
                                                            finalX = size - 1 - newMirrorY;
                                                            finalY = size - 1 - newMirrorX;
                                                        }
                                                        
                                                        if (finalX >= 0 && finalX < size && finalY >= 0 && finalY < size) {
                                                            grid[finalX][finalY] = true;
                                                            
                                                            let newMirrorX = size - 1 - finalX;
                                                            let newY = finalY;
                                                            
                                                            if (newMirrorX >= 0 && newMirrorX < size && newY >= 0 && newY < size) {
                                                                grid[newMirrorX][newY] = true;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            draw(p) {
                p.push();
                p.translate(this.x, this.y);
                
                let gridSize = this.grid.length;
                let totalSize = gridSize * this.cellSize;
                let startX = -totalSize / 2;
                let startY = -totalSize / 2;
                
                p.noStroke();
                
                for (let i = 0; i < gridSize; i++) {
                    for (let j = 0; j < gridSize; j++) {
                        if (this.grid[i][j]) {
                            switch(this.colorGrid[i][j]) {
                                case 'base':
                                    p.fill('#d9d8eb');
                                    break;
                                case 'purple':
                                    p.fill('#875fff');
                                    break;
                                case 'red':
                                    p.fill('#d42d17');
                                    break;
                                default:
                                    p.fill('#d9d8eb');
                            }
                            
                            p.rect(Math.floor(startX + i * this.cellSize), 
                                   Math.floor(startY + j * this.cellSize), 
                                   this.cellSize, 
                                   this.cellSize);
                        }
                    }
                }
                
                p.pop();
            }
        }
    };

        pfpSketch = new p5(pfpSketch);
        window.pfpSketch = pfpSketch;
}

/**
 * Generate a new random PFP with a random seed and color
 */
function regeneratePFP(silent = false) {
    if (!silent && typeof AudioManager !== 'undefined') {
        AudioManager.play('refresh');
    }
    let seedNumber = Math.floor(Math.random() * 900000) + 100000; // 6-digit
    let colorLetter = 'W'; // Always use white
    currentPFPSeed = `${seedNumber}-0-${colorLetter}`;
    currentPFPRotation = 0;
    
    // Regenerate with new seed - this will trigger color update
    window.generatePFPGlyph(seedNumber, 0);
    
    // Force regeneration to pick up the new color
    setTimeout(() => {
        window.generatePFPGlyph(seedNumber, 0);
    }, 10);
}

/**
 * Rotate the current PFP by 90 degrees
 */
function rotatePFP() {
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play('click');
    }
    window.rotatePFPGlyph();
    // Update the seed with new rotation
    let parts = currentPFPSeed.split('-');
    currentPFPSeed = `${parts[0]}-${currentPFPRotation}-${parts[2]}`;
}