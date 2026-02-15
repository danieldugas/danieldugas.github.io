function clamp01(value) {
    return Math.max(0.0, Math.min(1.0, value));
}

export class AudioManager {
    constructor(config) {
        this.music = {
            main: new Audio(config.mainMusic),
            boss: new Audio(config.bossMusic),
        };
        this.sfx = {};
        for (const [key, src] of Object.entries(config.sfx || {})) {
            this.sfx[key] = new Audio(src);
            this.sfx[key].preload = "auto";
        }

        this.currentMusicKey = null;
        for (const track of Object.values(this.music)) {
            track.loop = true;
            track.preload = "auto";
            track.volume = clamp01(config.musicVolume ?? 0.35);
        }

        this.defaultSfxVolume = clamp01(config.sfxVolume ?? 0.8);
        this.setupUnlockHandlers();
    }

    setupUnlockHandlers() {
        const unlock = () => {
            this.resumeDesiredMusic();
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
    }

    setMusicVolume(volume) {
        const next = clamp01(volume);
        for (const track of Object.values(this.music)) {
            track.volume = next;
        }
    }

    playMusic(key) {
        if (!this.music[key]) {
            return;
        }
        if (this.currentMusicKey === key) {
            this.resumeDesiredMusic();
            return;
        }
        if (this.currentMusicKey && this.music[this.currentMusicKey]) {
            const current = this.music[this.currentMusicKey];
            current.pause();
            current.currentTime = 0;
        }
        this.currentMusicKey = key;
        this.resumeDesiredMusic();
    }

    resumeDesiredMusic() {
        if (!this.currentMusicKey) {
            return;
        }
        const track = this.music[this.currentMusicKey];
        if (!track) {
            return;
        }
        track.play().catch(() => {});
    }

    playSfx(key, volumeScale = 1.0) {
        const base = this.sfx[key];
        if (!base) {
            return;
        }
        const voice = base.cloneNode();
        voice.volume = clamp01(this.defaultSfxVolume * volumeScale);
        voice.play().catch(() => {});
    }
}
