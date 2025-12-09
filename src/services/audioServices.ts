// @ts-ignore
import * as Tone from 'tone';

export class AudioService {
    private static instance: AudioService;
    public isInitialized = false;
    public isMusicMuted = false;
    public isSfxMuted = false;
    
    private musicBus: any;

    // Synths
    private accordion: any;
    private bass: any;
    private chordSynth: any;
    private accompaniment: any;
    private melody: any;

    private constructor() {}

    public static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    public async init() {
        if (this.isInitialized) {
            if (Tone.context.state !== 'running') {
                await Tone.context.resume();
            }
            return;
        }

        await Tone.start();
        
        // Create a bus for music so we can mute it separately from SFX
        this.musicBus = new Tone.Volume(0).toDestination();
        
        this.setupTransport();
        this.setupInstruments();
        this.composeTrack();
        Tone.Transport.start();
        this.isInitialized = true;
    }

    private setupTransport() {
        Tone.Transport.bpm.value = 135; 
        Tone.Transport.timeSignature = 3; 
    }

    private setupInstruments() {
        // Connect instruments to musicBus instead of direct destination
        const accordionVol = new Tone.Volume(-8).connect(this.musicBus);
        const chorus = new Tone.Chorus(2, 3, 0.5).connect(accordionVol).start();
        const vibrato = new Tone.Vibrato(4, 0.2).connect(chorus); 

        this.accordion = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.2, decay: 0.1, sustain: 0.7, release: 1.2 }
        }).connect(vibrato);

        const bassVol = new Tone.Volume(-4).connect(this.musicBus);
        this.bass = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 2, oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.5 }
        }).connect(bassVol);

        const chordVol = new Tone.Volume(-14).connect(this.musicBus);
        this.chordSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.1 }
        }).connect(chordVol);
    }

    private composeTrack() {
        this.accompaniment = new Tone.Part((time: any, event: any) => {
            if (event.role === 'bass') this.bass.triggerAttackRelease(event.note, "4n", time);
            else if (event.role === 'chord') this.chordSynth.triggerAttackRelease(event.note, "8n", time);
        }, [
            { time: "0:0:0", role: "bass", note: "A2" }, { time: "0:1:0", role: "chord", note: ["C4", "E4", "A4"] }, { time: "0:2:0", role: "chord", note: ["C4", "E4", "A4"] },
            { time: "1:0:0", role: "bass", note: "E2" }, { time: "1:1:0", role: "chord", note: ["C4", "E4", "A4"] }, { time: "1:2:0", role: "chord", note: ["C4", "E4", "A4"] },
            { time: "2:0:0", role: "bass", note: "D2" }, { time: "2:1:0", role: "chord", note: ["A3", "D4", "F4"] }, { time: "2:2:0", role: "chord", note: ["A3", "D4", "F4"] },
            { time: "3:0:0", role: "bass", note: "E2" }, { time: "3:1:0", role: "chord", note: ["G#3", "D4", "E4"] }, { time: "3:2:0", role: "chord", note: ["G#3", "D4", "E4"] },
        ]);
        this.accompaniment.loop = true;
        this.accompaniment.loopEnd = "4m";
        this.accompaniment.start(0);

        this.melody = new Tone.Part((time: any, note: any) => {
            this.accordion.triggerAttackRelease(note.note, note.duration, time);
        }, [
            { time: "0:0:0", note: "E5", duration: "2n." }, 
            { time: "1:0:0", note: "C5", duration: "4n" }, { time: "1:1:0", note: "B4", duration: "4n" }, { time: "1:2:0", note: "A4", duration: "4n" },
            { time: "2:0:0", note: "F5", duration: "2n" }, { time: "2:2:0", note: "A5", duration: "4n" }, 
            { time: "3:0:0", note: "G#5", duration: "2n." }, 
            { time: "4:0:0", note: "E5", duration: "2n" }, { time: "4:2:0", note: "D5", duration: "4n" },
            { time: "5:0:0", note: "C5", duration: "4n" }, { time: "5:1:0", note: "B4", duration: "4n" }, { time: "5:2:0", note: "A4", duration: "4n" },
            { time: "6:0:0", note: "B4", duration: "2n" }, { time: "6:2:0", note: "E4", duration: "4n" },
            { time: "7:0:0", note: "A4", duration: "2n." },
        ]);
        this.melody.loop = true;
        this.melody.loopEnd = "8m";
        this.melody.start(0);
    }

    public toggleMusicMute(): boolean {
        if (!this.isInitialized) return false;
        
        this.isMusicMuted = !this.isMusicMuted;
        
        if (this.musicBus) {
            this.musicBus.mute = this.isMusicMuted;
        }

        if (!this.isMusicMuted && Tone.context.state !== 'running') {
             Tone.context.resume();
        }
        return this.isMusicMuted;
    }

    public toggleSfxMute(): boolean {
        this.isSfxMuted = !this.isSfxMuted;
        return this.isSfxMuted;
    }

    public playLaserSound() {
        if (!this.isInitialized || this.isSfxMuted) return;
        if (Tone.context.state !== 'running') return; // Safety check

        // Create a temporary synth for the effect (goes direct to destination, bypassing music bus)
        const laser = new Tone.Synth({
            oscillator: { type: "fmsine", modulationType: "square", modulationIndex: 3 },
            envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.1 }
        }).toDestination();
        
        laser.volume.value = -5;
        
        const now = Tone.now();
        laser.triggerAttack("C6", now);
        // Ramp frequency down quickly for the "pew" sound
        laser.frequency.exponentialRampTo("C2", 0.3, now);
        // Clean up
        laser.stop(now + 0.3);
        setTimeout(() => laser.dispose(), 500);
    }
}
