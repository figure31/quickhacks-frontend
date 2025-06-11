// QuickHacks Music Player
// Background music system with full media controls

const MusicPlayer = {
    songs: [],
    currentIndex: 0,
    audio: null,
    isPlaying: false,
    isShuffled: false,
    shuffledPlaylist: [],
    shuffleIndex: 0,
    volume: 0.3,
    initialized: false,
    
    // Initialize music player and load song list
    init() {
        if (this.initialized) return;
        
        console.log('Initializing QuickHacks Music Player...');
        
        // Define all songs - sorted by artist name as requested
        this.songs = [
            { artist: 'Actress', title: 'Bubble Butts and Equations', file: './songs/Actress_Bubble Butts and Equations.mp3' },
            { artist: 'Actress', title: 'Caves Of Paradise', file: './songs/Actress_Caves Of Paradise.mp3' },
            { artist: 'Actress', title: 'Corner', file: './songs/Actress_Corner.mp3' },
            { artist: 'Actress', title: 'Dummy Corporation', file: './songs/Actress_Dummy Corporation.mp3' },
            { artist: 'Actress', title: 'Hubble', file: './songs/Actress_Hubble.mp3' },
            { artist: 'Actress', title: 'IWAAD', file: './songs/Actress_IWAAD.mp3' },
            { artist: 'Actress', title: 'Skyline', file: './songs/Actress_Skyline.mp3' },
            { artist: 'Actress', title: 'UNTITLED 7', file: './songs/Actress_UNTITLED 7.mp3' },
            { artist: 'Alva Noto', title: 'HYbrID Sync Dark', file: './songs/Alva Noto - HYbrID Sync Dark.mp3' },
            { artist: 'Alva Noto', title: 'HYbrID Rehuman', file: './songs/Alva Noto_HYbrID Rehuman.mp3' },
            { artist: 'Andy Stott', title: 'Bad Wires', file: './songs/Andy Stott_Bad Wires.mp3' },
            { artist: 'Andy Stott', title: 'We Stay Together', file: './songs/Andy Stott_We Stay Together.mp3' },
            { artist: 'Aphex Twin', title: 'Hedphelym', file: './songs/Aphex Twin _Hedphelym.mp3' },
            { artist: 'Aphex Twin', title: 'Boxing Day', file: './songs/Aphex Twin_ Boxing Day.mp3' },
            { artist: 'Aphex Twin', title: 'Alberto Balsalm', file: './songs/Aphex Twin_Alberto Balsalm.mp3' },
            { artist: 'Aphex Twin', title: 'Cilonen', file: './songs/Aphex Twin_Cilonen.mp3' },
            { artist: 'Aphex Twin', title: 'Pwsteal.Ldpinch.D', file: './songs/Aphex Twin_Pwsteal.Ldpinch.D.mp3' },
            { artist: 'Aphex Twin', title: 'We are the music makers', file: './songs/Aphex Twin_We are the music makers.mp3' },
            { artist: 'Autechre', title: 'Flutter', file: './songs/Autechre_Flutter.mp3' },
            { artist: 'Autechre', title: 'Rae', file: './songs/Autechre_Rae.mp3' },
            { artist: 'Bass Clef', title: 'neon-joy threads', file: './songs/Bass Clef_neon-joy threads.mp3' },
            { artist: 'Bass Clef', title: 'press f5 deep home', file: './songs/Bass Clef_press f5 deep home.mp3' },
            { artist: 'Burial', title: 'Etched Headplate', file: './songs/Burial_Etched Headplate.mp3' },
            { artist: 'Burial', title: 'Phoneglow', file: './songs/Burial_Phoneglow.mp3' },
            { artist: 'Burial', title: 'Southern Comfort', file: './songs/Burial_Southern Comfort.mp3' },
            { artist: 'Burial', title: 'Stolen Dog', file: './songs/Burial_Stolen Dog.mp3' },
            { artist: 'Caterina Barbieri', title: 'Bow of Perception', file: './songs/Caterina Barbieri_Bow of Perception.mp3' },
            { artist: 'Caterina Barbieri', title: 'INTCAEB', file: './songs/Caterina Barbieri_INTCAEB.mp3' },
            { artist: 'Caterina Barbieri', title: 'This Causes Consciousness to Fracture', file: './songs/Caterina Barbieri_This Causes Consciousness to Fracture.mp3' },
            { artist: 'Christoph De Babalon', title: 'Opium', file: './songs/Christoph De Babalon_Opium.mp3' },
            { artist: 'Esoterik', title: 'Mayhem', file: './songs/Esoterik_Mayhem.mp3' },
            { artist: 'Hardfloor', title: 'Lost In The Silverbox', file: './songs/Hardfloor_Lost In The Silverbox.mp3' },
            { artist: 'Kode9', title: 'Eyes Go Blank', file: './songs/Kode9_Eyes Go Blank.mp3' },
            { artist: 'Mica Levi', title: 'Delete Beach', file: './songs/Mica Levi_Delete Beach.mp3' },
            { artist: 'Pinch', title: 'Gangstaz', file: './songs/Pinch_Gangstaz.mp3' },
            { artist: 'Plastikman', title: 'Consumed', file: './songs/Plastikman_Consumed.mp3' },
            { artist: 'Plastikman', title: 'Locomotion', file: './songs/Plastikman_Locomotion.mp3' },
            { artist: 'Plastikman', title: 'Plasticity', file: './songs/Plastikman_Plasticity.mp3' },
            { artist: 'Ryoji Ikeda', title: 'data.matrix', file: './songs/Ryoji Ikeda_data.matrix.mp3' },
            { artist: 'TIM HECKER', title: 'Radiance', file: './songs/TIM HECKER_Radiance.mp3' },
            { artist: 'TIM HECKER', title: 'Stab Variation', file: './songs/TIM HECKER_Stab Variation.mp3' },
            { artist: 'Vessel', title: 'Punish, Honey', file: './songs/Vessel_Punish, Honey.mp3' }
        ];
        
        // Always start with a random song on page load
        this.currentIndex = Math.floor(Math.random() * this.songs.length);
        
        // Initialize shuffled playlist
        this.generateShuffledPlaylist();
        
        // Create audio element
        this.audio = new Audio();
        this.audio.volume = this.volume;
        
        // Set up audio event listeners
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('error', (e) => {
            console.warn('Music player error:', e);
            this.next(); // Skip to next song on error
        });
        this.audio.addEventListener('loadstart', () => this.updateDisplay());
        this.audio.addEventListener('canplay', () => this.updateDisplay());
        
        // Load first song
        this.loadCurrentSong();
        this.updateDisplay();
        
        this.initialized = true;
        console.log('Music Player initialized with', this.songs.length, 'songs');
    },
    
    // Load the current song into audio element
    loadCurrentSong() {
        if (this.songs.length === 0) return;
        
        const song = this.getCurrentSong();
        if (this.audio.src !== song.file) {
            this.audio.src = song.file;
        }
    },
    
    // Get current song object
    getCurrentSong() {
        return this.songs[this.currentIndex];
    },
    
    // Play/pause toggle
    togglePlay() {
        if (!this.initialized) this.init();
        
        // Always try to enable audio on first interaction
        this.enableAudio();
        
        if (this.isPlaying) {
            this.pause();
        } else {
            // Small delay to ensure audio context is unlocked
            setTimeout(() => {
                this.play();
            }, 50);
        }
    },
    
    // Play current song
    play() {
        if (!this.audio) return;
        
        this.loadCurrentSong();
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.updateDisplay();
            }).catch(error => {
                console.warn('Music autoplay blocked:', error);
                // Try to unlock audio context on first interaction
                this.enableAudio();
                this.isPlaying = false;
                this.updateDisplay();
            });
        }
    },
    
    // Enable user interaction to unlock audio
    enableAudio() {
        if (!this.initialized) this.init();
        
        // Play a silent sound to unlock audio context
        if (this.audio) {
            const originalVolume = this.audio.volume;
            this.audio.volume = 0;
            this.audio.play().then(() => {
                this.audio.volume = originalVolume;
                console.log('Audio unlocked by user interaction');
            }).catch(() => {});
        }
    },
    
    // Pause current song
    pause() {
        if (!this.audio) return;
        
        this.audio.pause();
        this.isPlaying = false;
        this.updateDisplay();
    },
    
    // Skip to next song
    next() {
        if (this.songs.length === 0) return;
        
        if (this.isShuffled) {
            // Move to next song in shuffled playlist
            this.shuffleIndex = (this.shuffleIndex + 1) % this.shuffledPlaylist.length;
            this.currentIndex = this.shuffledPlaylist[this.shuffleIndex];
        } else {
            // Follow ordered list
            this.currentIndex = (this.currentIndex + 1) % this.songs.length;
        }
        
        this.loadCurrentSong();
        if (this.isPlaying) {
            this.play();
        } else {
            this.updateDisplay();
        }
    },
    
    // Skip to previous song
    previous() {
        if (this.songs.length === 0) return;
        
        if (this.isShuffled) {
            // Move to previous song in shuffled playlist
            this.shuffleIndex = this.shuffleIndex === 0 ? this.shuffledPlaylist.length - 1 : this.shuffleIndex - 1;
            this.currentIndex = this.shuffledPlaylist[this.shuffleIndex];
        } else {
            // Follow ordered list backwards
            this.currentIndex = this.currentIndex === 0 ? this.songs.length - 1 : this.currentIndex - 1;
        }
        
        this.loadCurrentSong();
        if (this.isPlaying) {
            this.play();
        } else {
            this.updateDisplay();
        }
    },
    
    // Toggle shuffle mode
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        
        if (this.isShuffled) {
            // Generate new shuffled playlist and find current song position
            this.generateShuffledPlaylist();
            this.shuffleIndex = this.shuffledPlaylist.indexOf(this.currentIndex);
            if (this.shuffleIndex === -1) this.shuffleIndex = 0;
        }
        
        this.updateDisplay();
        console.log('Shuffle mode:', this.isShuffled ? 'ON' : 'OFF');
    },
    
    // Generate a shuffled playlist that goes through all songs once
    generateShuffledPlaylist() {
        // Create array of indices
        this.shuffledPlaylist = [...Array(this.songs.length).keys()];
        
        // Fisher-Yates shuffle algorithm
        for (let i = this.shuffledPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledPlaylist[i], this.shuffledPlaylist[j]] = [this.shuffledPlaylist[j], this.shuffledPlaylist[i]];
        }
        
        this.shuffleIndex = 0;
    },
    
    // Shuffle array in place
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },
    
    // Update display elements
    updateDisplay() {
        const playBtn = document.getElementById('musicPlay');
        const shuffleBtn = document.getElementById('musicShuffle');
        const headerNowPlaying = document.getElementById('headerNowPlaying');
        
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸' : '▶';
            playBtn.style.color = this.isPlaying ? '#bd93f9' : '#d9d8eb';
        }
        
        if (shuffleBtn) {
            shuffleBtn.style.color = this.isShuffled ? '#bd93f9' : '#d9d8eb';
        }
        
        if (this.songs.length > 0 && headerNowPlaying) {
            const song = this.getCurrentSong();
            // Extract filename from file path and remove .mp3 extension
            const filename = song.file.split('/').pop().replace('.mp3', '');
            headerNowPlaying.textContent = filename;
        }
    },
    
    // Set volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    },
    
    // Get current status
    getStatus() {
        return {
            isPlaying: this.isPlaying,
            isShuffled: this.isShuffled,
            currentSong: this.getCurrentSong(),
            songCount: this.songs.length,
            volume: this.volume
        };
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MusicPlayer.init();
});

// Unlock audio on first user interaction
document.addEventListener('click', () => {
    if (MusicPlayer.initialized && !MusicPlayer.audio.readyState) {
        MusicPlayer.loadCurrentSong();
    }
}, { once: true });