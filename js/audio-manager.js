// QuickHacks Audio Manager
// Handles all sound effects for the game interface

const AudioManager = {
    sounds: {},
    enabled: true,
    volume: 0.3,
    initialized: false,
    
    // Initialize audio system and preload all sound files
    init() {
        if (this.initialized) return;
        
        
        // Define all sound files
        this.sounds = {
            click: new Audio('./sounds/click.mp3'),
            address_target: new Audio('./sounds/address_target.mp3'),
            connect: new Audio('./sounds/connect.mp3'),
            disconnect: new Audio('./sounds/disconnect.mp3'),
            deposit: new Audio('./sounds/deposit.mp3'),
            withdrawal: new Audio('./sounds/withdrawal.mp3'),
            execute_quickhack: new Audio('./sounds/execute_quickhack.mp3'),
            quickhack_success: new Audio('./sounds/quickhack_success.mp3'),
            quickhack_fail: new Audio('./sounds/quickhack_fail.mp3'),
            page_refresh: new Audio('./sounds/page_refresh.mp3'),
            refresh: new Audio('./sounds/refresh.mp3'),
            self_cast: new Audio('./sounds/self_cast.mp3')
        };
        
        // Configure all audio objects
        Object.entries(this.sounds).forEach(([name, audio]) => {
            audio.volume = this.volume;
            audio.preload = 'auto';
            
            // Handle loading errors gracefully
            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${name}`, e);
            });
            
        });
        
        this.initialized = true;
    },
    
    // Play a specific sound
    play(soundName) {
        if (!this.enabled || !this.initialized) return;
        
        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }
        
        try {
            // Reset sound to beginning and play
            sound.currentTime = 0;
            const playPromise = sound.play();
            
            // Handle autoplay restrictions
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Only log the first autoplay restriction, not spam
                    if (error.name === 'NotAllowedError' && !this.autoplayWarningShown) {
                        console.log('Audio autoplay blocked by browser - sounds will work after user interaction');
                        this.autoplayWarningShown = true;
                    }
                });
            }
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    },
    
    // Enable user interaction to unlock audio
    enableAudio() {
        if (!this.initialized) this.init();
        
        // Play a silent sound to unlock audio context
        const testSound = this.sounds.click;
        if (testSound) {
            testSound.volume = 0;
            testSound.play().then(() => {
                testSound.volume = this.volume;
            }).catch(() => {});
        }
    },
    
    // Toggle audio on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    
    // Set volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(audio => {
            audio.volume = this.volume;
        });
    },
    
    // Get current settings
    getStatus() {
        return {
            enabled: this.enabled,
            volume: this.volume,
            initialized: this.initialized,
            soundCount: Object.keys(this.sounds).length
        };
    }
};

// Initialize audio system when page loads
document.addEventListener('DOMContentLoaded', () => {
    AudioManager.init();
    
});

// Unlock audio on first user interaction
document.addEventListener('click', () => {
    AudioManager.enableAudio();
}, { once: true });