// Synthesized locally. Suspended means no background audio processing.
export class Ambience {
  constructor(){this.context=null;this.enabled=false;this.active=false;this.available=true;}
  async set(enabled,active){
    this.enabled=enabled;
    this.active=active;
    if(!this.enabled||!this.active){if(this.context) await this.context.suspend();return;}
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){this.available=false;return;}
    if(!this.context){
      try{
        const context=this.context=new Audio();
        const volume=context.createGain();volume.gain.value=.045;volume.connect(context.destination);
        const hum=context.createOscillator();hum.type='sine';hum.frequency.value=58;
        const quiet=context.createGain();quiet.gain.value=.24;hum.connect(quiet).connect(volume);hum.start();
        const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
        const data=buffer.getChannelData(0);let last=0;
        for(let i=0;i<data.length;i++){last=(last+(.02*(Math.random()*2-1)))/1.02;data[i]=last*3.5;}
        const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=280;
        source.connect(filter).connect(volume);source.start();
      }catch{this.available=false;return;}
    }
    const context=this.context;
    try{await context.resume();}catch{this.available=false;return;}
    if(this.context===context&&(!this.enabled||!this.active)) await context.suspend();
  }
  dispose(){this.context?.close();this.context=null;}
}
