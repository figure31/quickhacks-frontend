/**
 * Game Map Network Visualization
 * Generates a cyberpunk-style network topology visualization using p5.js
 * Shows player nodes connected to central contract with circuit-style connections
 * QuickHacks Game Frontend Module
 */

// Game Map Variables
let mapSketch = null;
let mapP5Instance = null;
let mapPlayers = [];
let contractNode = null;
let animationFrames = [];
let mapPlayerData = []; // Independent map player data
let targetedAddress = null; // Address currently selected as target
let activeAnimations = []; // Array to track ongoing pulse animations
let animationCounter = 0; // Counter to stagger multiple animations

/**
 * Fetch players specifically for map visualization
 * Queries up to 500 players with minimum 100 RAM balance
 * @returns {Array} Formatted player data for map display
 */
async function fetchMapPlayers() {
    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                query: `
                    query GetMapPlayers {
                        players(
                            where: {currentBalance_gt: "100"}, 
                            orderBy: currentBalance, 
                            orderDirection: desc, 
                            first: 500
                        ) {
                            id
                            currentBalance
                            totalDeposited
                            totalWithdrawn
                            damageDealt
                            damageTaken
                            attackBonus
                            defenseBonus
                            isFaraday
                            isBoss
                            isBanned
                            isCheatingDeath
                            activeEffects(where: {isActive: true}) {
                                id
                                quickhackType
                                effectType
                                magnitude
                                endBlock
                                appliedAt
                            }
                        }
                    }
                `
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            return [];
        }

        // Format players for map use (simplified format)
        const formattedPlayers = data.data.players.map(player => {
            return {
                address: player.id,
                balance: parseInt(player.currentBalance),
                attackBonus: player.attackBonus || 0,
                defenseBonus: player.defenseBonus || 0,
                isFaraday: player.isFaraday || false,
                isBoss: player.isBoss || false,
                isBanned: player.isBanned || false,
                effects: player.activeEffects || []
            };
        });

        return formattedPlayers;

    } catch (error) {
        console.error('Error fetching map players:', error);
        return [];
    }
}

/**
 * Refresh game map manually by fetching new data and updating display
 */
async function refreshGameMap(silent = false) {
    if (!silent && typeof AudioManager !== 'undefined') {
        AudioManager.play('refresh');
    }
    mapPlayerData = await fetchMapPlayers();
    if (mapP5Instance && mapP5Instance.updateMapPlayers) {
        mapP5Instance.updateMapPlayers();
    }
}

/**
 * Set the targeted address for red highlighting on the map
 * @param {string} address - The address to highlight, or null to clear
 */
function setTargetedAddress(address) {
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play('address_target');
    }
    targetedAddress = address ? address.toLowerCase() : null;
    // Just redraw without regenerating positions (no need to call updateMapPlayers)
    // The draw loop will automatically use the new targetedAddress value
    
    // Add binary loading animation to target input field
    const targetInput = document.getElementById('targetAddressInput');
    if (targetInput && address) {
        // Show random binary loading 
        const binaryInterval = setInterval(() => {
            // Generate random 8-character binary string
            let randomBinary = '';
            for (let i = 0; i < 8; i++) {
                randomBinary += Math.random() < 0.5 ? '0' : '1';
            }
            targetInput.value = randomBinary;
        }, 150); // Change every 150ms
        
        // After 600ms, show the actual new address
        setTimeout(() => {
            clearInterval(binaryInterval);
            targetInput.value = address;
        }, 600);
    }
    
    // Update target input styling based on whether targeting other player
    updateTargetInputStyling(address);
}

/**
 * Update the styling of target input field based on whether targeting another player
 * @param {string} address - The target address
 */
function updateTargetInputStyling(address) {
    const targetInput = document.getElementById('targetAddressInput');
    const targetDetailItem = targetInput ? targetInput.closest('.detail-item') : null;
    
    if (!targetInput || !targetDetailItem) return;
    
    // Check if we have a connected wallet and a target address
    const hasConnectedWallet = typeof connectedWalletAddress !== 'undefined' && connectedWalletAddress;
    const hasTargetAddress = address && address.trim();
    
    // Remove all targeting classes first
    targetInput.classList.remove('targeting-other', 'targeting-self');
    targetDetailItem.classList.remove('targeting-other', 'targeting-self');
    
    if (hasConnectedWallet && hasTargetAddress) {
        const isSelfTargeting = address.toLowerCase() === connectedWalletAddress.toLowerCase();
        
        if (isSelfTargeting) {
            // Add purple styling for self-targeting
            targetInput.classList.add('targeting-self');
            targetDetailItem.classList.add('targeting-self');
        } else {
            // Add red styling for targeting other players
            targetInput.classList.add('targeting-other');
            targetDetailItem.classList.add('targeting-other');
        }
    }
}

/**
 * PulseAnimation class to manage individual traveling pulses
 */
class PulseAnimation {
    constructor(pathSegments, type, startTime, attackerAddr = null, targetAddr = null) {
        this.pathSegments = pathSegments; // Store exact path at creation time
        this.progress = 0; // 0-1 animation progress
        this.type = type; // 'attack' or 'self-cast'
        this.startTime = startTime;
        this.duration = type === 'self-cast' ? 6000 : 3000; // ms (slower animation)
        this.attackerAddr = attackerAddr;
        this.targetAddr = targetAddr;
        this.isComplete = false;
    }
    
    update(currentTime) {
        const elapsed = currentTime - this.startTime;
        this.progress = Math.min(elapsed / this.duration, 1);
        
        if (this.progress >= 1) {
            this.isComplete = true;
        }
    }
    
    getCurrentPosition() {
        // Use the stored path from creation time - no dynamic calculation
        return getPulsePosition(this.pathSegments, this.progress);
    }
}

/**
 * Calculate pulse position along path segments based on progress (0-1)
 */
function getPulsePosition(pathSegments, progress) {
    if (!pathSegments || pathSegments.length === 0) return null;
    
    // Calculate total path length
    let totalLength = 0;
    const segmentLengths = [];
    
    pathSegments.forEach(segment => {
        const length = Math.sqrt(
            Math.pow(segment.end.x - segment.start.x, 2) + 
            Math.pow(segment.end.y - segment.start.y, 2)
        );
        segmentLengths.push(length);
        totalLength += length;
    });
    
    // Find target distance along path
    const targetDistance = progress * totalLength;
    
    // Find which segment contains the pulse
    let currentDistance = 0;
    for (let i = 0; i < pathSegments.length; i++) {
        const segmentLength = segmentLengths[i];
        
        if (currentDistance + segmentLength >= targetDistance) {
            // Pulse is in this segment
            const segmentProgress = (targetDistance - currentDistance) / segmentLength;
            const segment = pathSegments[i];
            
            return {
                x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
                y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress,
                angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x)
            };
        }
        
        currentDistance += segmentLength;
    }
    
    // Fallback to end of last segment
    const lastSegment = pathSegments[pathSegments.length - 1];
    return {
        x: lastSegment.end.x,
        y: lastSegment.end.y,
        angle: Math.atan2(lastSegment.end.y - lastSegment.start.y, lastSegment.end.x - lastSegment.start.x)
    };
}

/**
 * Get circuit path as array of segments
 */
function getCircuitPath(x1, y1, x2, y2) {
    // Replicate the circuit connection logic
    let step1X = x1 + (x2 - x1) * 0.3;
    let step2Y = y1 + (y2 - y1) * 0.6;
    let step3X = step1X + (x2 - step1X) * 0.7;
    
    return [
        {start: {x: x1, y: y1}, end: {x: step1X, y: y1}},
        {start: {x: step1X, y: y1}, end: {x: step1X, y: step2Y}},
        {start: {x: step1X, y: step2Y}, end: {x: step3X, y: step2Y}},
        {start: {x: step3X, y: step2Y}, end: {x: step3X, y: y2}},
        {start: {x: step3X, y: y2}, end: {x: x2, y: y2}}
    ];
}

/**
 * Find player position by address
 */
function findPlayerPosition(address) {
    if (!address) return null;
    return mapPlayers.find(p => 
        p.address.toLowerCase() === address.toLowerCase()
    );
}

/**
 * Start attack animation from attacker to target via center
 */
function startAttackAnimation(attackerAddr, targetAddr) {
    const attackerPos = findPlayerPosition(attackerAddr);
    const targetPos = findPlayerPosition(targetAddr);
    
    if (!attackerPos || !targetPos || !contractNode) return;
    
    // The key insight: the target's line is drawn from target→center
    // So for center→target, we need to reverse that exact same path
    const targetLine = getCircuitPath(targetPos.x, targetPos.y, contractNode.x, contractNode.y);
    const centerToTarget = [...targetLine].reverse().map(segment => ({
        start: segment.end,
        end: segment.start
    }));
    
    // Attacker to center uses attacker's own line path
    const attackerToCenter = getCircuitPath(attackerPos.x, attackerPos.y, contractNode.x, contractNode.y);
    
    // Combine them
    const completePath = [...attackerToCenter, ...centerToTarget];
    
    // Stagger multiple animations with a small delay to make them visible as separate pulses
    const delayOffset = animationCounter * 400; // 400ms delay between pulses
    animationCounter++;
    
    const animation = new PulseAnimation(
        completePath,
        'attack',
        Date.now() + delayOffset,
        attackerAddr,
        targetAddr
    );
    
    activeAnimations.push(animation);
}

/**
 * Start self-cast animation from player to center and back
 */
function startSelfCastAnimation(playerAddr) {
    const playerPos = findPlayerPosition(playerAddr);
    
    if (!playerPos || !contractNode) return;
    
    // Use the player's own line path (player→center) for both directions
    const playerLine = getCircuitPath(playerPos.x, playerPos.y, contractNode.x, contractNode.y);
    const centerToPlayer = [...playerLine].reverse().map(segment => ({
        start: segment.end,
        end: segment.start
    }));
    
    // Combine: player→center + center→player (reversed player line)
    const completePath = [...playerLine, ...centerToPlayer];
    
    // Stagger multiple animations with a small delay to make them visible as separate pulses  
    const delayOffset = animationCounter * 400; // 400ms delay between pulses
    animationCounter++;
    
    const animation = new PulseAnimation(
        completePath,
        'self-cast',
        Date.now() + delayOffset,
        playerAddr,
        playerAddr
    );
    
    activeAnimations.push(animation);
}

/**
 * Draw all active pulses
 */
function drawActivePulses(p) {
    const currentTime = Date.now();
    
    // Update and draw each active animation
    activeAnimations.forEach(animation => {
        animation.update(currentTime);
        
        if (!animation.isComplete) {
            const position = animation.getCurrentPosition();
            if (position) {
                // Draw pulse as simple thick line segment - exactly like normal lines but thicker
                p.stroke('#d9d8eb');
                p.strokeWeight(3); // Just a thicker version of normal line
                
                const pulseLength = 5;
                const halfLength = pulseLength / 2;
                
                // Calculate line endpoints based on angle - same method as normal lines
                const startX = position.x - Math.cos(position.angle) * halfLength;
                const startY = position.y - Math.sin(position.angle) * halfLength;
                const endX = position.x + Math.cos(position.angle) * halfLength;
                const endY = position.y + Math.sin(position.angle) * halfLength;
                
                p.line(startX, startY, endX, endY);
            }
        }
    });
    
    // Remove completed animations
    activeAnimations = activeAnimations.filter(anim => !anim.isComplete);
}

/**
 * Initialize the game map visualization system
 * Creates p5.js canvas and sets up the network topology display
 */
async function initializeGameMap() {
    // Fetch map data first
    mapPlayerData = await fetchMapPlayers();
    mapSketch = function(p) {
        let canvas;
        
        p.setup = function() {
            let container = document.getElementById('gameMapContainer');
            let mapWidth = container.clientWidth - 8;
            let mapHeight = container.clientHeight - 8;
            
            // Force minimum height if container is too small
            if (mapHeight < 200) {
                mapHeight = 300;
            }
            
            canvas = p.createCanvas(mapWidth, mapHeight);
            canvas.parent('gameMapContainer');
            
            // Create contract node at center - calculate size based on total ETH
            let totalRAM = mapPlayerData.reduce((sum, player) => sum + player.balance, 0);
            let totalETH = totalRAM / 10000000; // 10M RAM = 1 ETH
            let contractSize = Math.max(30, Math.min(60, totalETH * 10)); // Scale with ETH
            
            contractNode = {
                x: p.width / 2,
                y: p.height / 2,
                size: contractSize,
                color: '#d9d8eb'
            };
            
            // Generate player nodes from independent map data
            generateMapPlayers();
        }
        
        p.draw = function() {
            p.background('#171a1d');
            
            // Draw connections first (behind nodes)
            drawConnections();
            
            // Draw animated pulses on top of connections
            drawActivePulses(p);
            
            // Draw contract node
            p.fill('#171a1d');
            p.stroke('#d9d8eb');
            p.strokeWeight(1);
            p.rect(contractNode.x - contractNode.size/2, contractNode.y - contractNode.size/2, 
                   contractNode.size, contractNode.size);
            
            // Draw player nodes
            mapPlayers.forEach((player, index) => {
                // Check if player is within canvas bounds
                if (player.x >= 0 && player.x <= p.width && player.y >= 0 && player.y <= p.height) {
                    // Special styling for boss and team addresses
                    const bossAddress = '0x05351d48d04e16b05e388394e6abb25054d0ad5a';
                    const teamAddress = '0xd63a12d5dd3bccc018735eaebb70a51ed351b56e';
                    
                    // Check if this is the connected player (access global variable from index.html)
                    const isConnectedPlayer = typeof connectedWalletAddress !== 'undefined' && 
                                            connectedWalletAddress && 
                                            player.address.toLowerCase() === connectedWalletAddress.toLowerCase();
                    
                    // Check if this is the targeted player
                    const isTargetedPlayer = targetedAddress && 
                                           player.address.toLowerCase() === targetedAddress.toLowerCase() &&
                                           !isConnectedPlayer; // Don't show red outline for connected player
                    
                    // Check if this is boss/team address
                    const isBossOrTeam = player.address.toLowerCase() === bossAddress.toLowerCase() || 
                                        player.address.toLowerCase() === teamAddress.toLowerCase();
                    
                    if (isBossOrTeam && !isTargetedPlayer) {
                        // Draw like central node: background fill + white outline (only when not targeted)
                        p.fill('#171a1d');
                        p.stroke('#d9d8eb');
                        p.strokeWeight(1);
                        p.rect(player.x - player.size/2, player.y - player.size/2, 
                               player.size, player.size);
                    } else if (isBossOrTeam && isTargetedPlayer) {
                        // Boss/team node when targeted: red fill
                        p.fill('#d42d17');
                        p.noStroke();
                        p.rect(player.x - player.size/2, player.y - player.size/2, 
                               player.size, player.size);
                    } else if (isConnectedPlayer) {
                        // Connected player: draw purple node only
                        p.fill('#875fff'); // Purple color for connected player node
                        p.noStroke();
                        p.rect(player.x - player.size/2, player.y - player.size/2, 
                               player.size, player.size);
                    } else if (isTargetedPlayer) {
                        // Targeted player: draw red node only
                        p.fill('#d42d17'); // Red color for targeted player node
                        p.noStroke();
                        p.rect(player.x - player.size/2, player.y - player.size/2, 
                               player.size, player.size);
                    } else {
                        // Normal player styling: solid color fill
                        p.fill(player.color);
                        p.noStroke();
                        p.rect(player.x - player.size/2, player.y - player.size/2, 
                               player.size, player.size);
                    }
                }
            });
        }
        
        p.mousePressed = function() {
            // Check if clicked on a player node
            mapPlayers.forEach(player => {
                let d = p.dist(p.mouseX, p.mouseY, player.x, player.y);
                if (d < player.size/2 + 5) {
                    // Set target in attack simulator - correct selector
                    const targetInput = document.querySelector('.target-input');
                    if (targetInput) {
                        targetInput.value = player.address;
                        // Highlight this player on the map with red outline
                        setTargetedAddress(player.address);
                    }
                }
            });
        }
        
        function generateMapPlayers() {
            mapPlayers = [];
            const centerX = p.width / 2;
            const centerY = p.height / 2;
            const radius = Math.min(p.width, p.height) * 0.35;
            
            // Dynamic spacing: fewer pixels between nodes when more players
            const minSpacing = Math.max(5, 35 - Math.floor(mapPlayerData.length / 5));
            const maxAttempts = Math.max(10, 60 - mapPlayerData.length);
            
            // Map already filters to 500 max players with 100+ RAM
            let playersToDisplay = mapPlayerData;
            
            playersToDisplay.forEach((player, index) => {
                // All player nodes are now white
                let playerColor = '#d9d8eb'; // White color for all players
                
                // Spread players across canvas with more horizontal distribution
                let x, y;
                
                // Generate position avoiding center and other players
                let attempts = 0;
                let validPosition = false;
                
                do {
                    x = p.random(40, p.width - 40);
                    y = p.random(40, p.height - 40);
                    attempts++;
                    
                    // Check distance from center
                    let distanceFromCenter = p.dist(x, y, centerX, centerY);
                    
                    // Check distance from other players
                    let tooCloseToOthers = false;
                    for (let other of mapPlayers) {
                        if (p.dist(x, y, other.x, other.y) < minSpacing) { // Dynamic spacing
                            tooCloseToOthers = true;
                            break;
                        }
                    }
                    
                    validPosition = distanceFromCenter >= 80 && !tooCloseToOthers;
                    
                } while (!validPosition && attempts < maxAttempts);
                
                // Fallback: use grid positioning if random placement fails
                if (attempts >= maxAttempts) {
                    let cols = Math.ceil(Math.sqrt(playersToDisplay.length));
                    let gridX = (index % cols) * (p.width / cols) + (p.width / cols / 2);
                    let gridY = Math.floor(index / cols) * (p.height / cols) + (p.height / cols / 2);
                    x = gridX;
                    y = gridY;
                }
                
                // Dynamic node size scaling: smaller nodes when more players
                let minNodeSize = Math.max(4, 8 - Math.floor(playersToDisplay.length / 50));
                let maxNodeSize = Math.max(15, 25 - Math.floor(playersToDisplay.length / 30));
                let maxBalance = Math.max(...playersToDisplay.map(p => p.balance));
                let normalizedSize = p.map(player.balance, 0, maxBalance, minNodeSize, maxNodeSize);
                
                mapPlayers.push({
                    address: player.address,
                    x: x,
                    y: y,
                    size: normalizedSize,
                    color: playerColor,
                    balance: player.balance
                });
            });
        }
        
        function drawConnections() {
            mapPlayers.forEach(player => {
                // Draw circuit-style connections (not straight lines)
                drawCircuitConnection(player.x, player.y, contractNode.x, contractNode.y);
            });
        }
        
        function drawCircuitConnection(x1, y1, x2, y2) {
            // Set stroke for lines
            p.stroke('#d9d8eb');
            p.strokeWeight(1);
            
            // Use the same path calculation as animations to ensure perfect alignment
            const pathSegments = getCircuitPath(x1, y1, x2, y2);
            
            // Draw each segment
            pathSegments.forEach(segment => {
                p.line(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
            });
        }
        
        // Resize handler
        p.windowResized = function() {
            let mapWidth = document.getElementById('gameMapContainer').clientWidth - 4;
            let mapHeight = document.getElementById('gameMapContainer').clientHeight - 4;
            p.resizeCanvas(mapWidth, mapHeight);
            contractNode.x = p.width / 2;
            contractNode.y = p.height / 2;
            generateMapPlayers();
        }
        
        // Expose generateMapPlayers function for external access
        p.updateMapPlayers = function() {
            generateMapPlayers();
        }
    };
    
    mapP5Instance = new p5(mapSketch);
}