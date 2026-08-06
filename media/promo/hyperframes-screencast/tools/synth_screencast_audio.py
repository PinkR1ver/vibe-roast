#!/usr/bin/env python3
"""Soft ambient sound bed — warm pads, gentle piano tones, subtle rhythmic pulse."""

import math, struct, wave, random, os

SAMPLE_RATE = 48000
DURATION = 42.0
OUTPUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "screencast-audio.wav")

def sine(freq, t): return math.sin(2*math.pi*freq*t)

def soft_noise(seed):
    seed = (seed*1664525+1013904223)&0xFFFFFFFF
    return (seed>>16)/32768.0, seed

def write_wav(filename, L, R=None):
    if R is None: R=L
    n=min(len(L),len(R)); os.makedirs(os.path.dirname(filename),exist_ok=True)
    with wave.open(filename,"w") as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SAMPLE_RATE)
        for i in range(n):
            l=max(-1,min(1,L[i])); r=max(-1,min(1,R[i]))
            wf.writeframes(struct.pack("<hh",int(l*32767),int(r*32767)))

def generate():
    total = int(DURATION*SAMPLE_RATE)
    L=[0.0]*total; R=[0.0]*total
    seed=42

    # Layer 1: Warm pad — Dm9 chord
    chord = [147, 175, 220, 262, 330]
    for i in range(0, int(40*SAMPLE_RATE)):
        t=i/SAMPLE_RATE
        fi=min(1.0,t/3.0); fo=min(1.0,(40-t)/2.0) if t>38 else 1.0
        env=fi*fo; s=0.0
        for j,f in enumerate(chord):
            vol=0.12/(j+1); det=1.0+0.0005*j
            trem=1.0+0.1*math.sin(2*math.pi*0.25*t+0.5*j)
            s+=sine(f*det,t)*vol*trem
        s*=env; L[i]+=s; R[i]+=s
        R[i]+=sine(220*1.002,t)*0.03*env
        L[i]+=sine(262*0.998,t)*0.03*env

    # Layer 2: Gentle piano tones at key moments
    notes=[
        (3.5,294,0.35),(6.5,330,0.30),(12.5,392,0.25),
        (16.0,440,0.30),(16.45,494,0.30),(16.9,523,0.30),(17.35,587,0.30),
        (21.0,440,0.22),(30.5,330,0.28),(34.0,392,0.25),(37.3,523,0.35),
    ]
    for tn,freq,vel in notes:
        ns=int(tn*SAMPLE_RATE); nl=int(2.5*SAMPLE_RATE)
        for i in range(nl):
            idx=ns+i
            if idx>=total: break
            tl=i/SAMPLE_RATE
            et=(tl/0.008) if tl<0.008 else math.exp(-(tl-0.008)*2.8)
            tone=(sine(freq,tl)+sine(freq*2,tl)*0.25+sine(freq*3,tl)*0.08)*et*vel*0.55
            pan=0.5+0.5*math.sin(tn*0.7)
            L[idx]+=tone*(1-pan+0.3); R[idx]+=tone*(pan+0.3)

    # Layer 3: Subtle sub-bass pulse (~55 BPM)
    for i in range(int(6*SAMPLE_RATE), int(38*SAMPLE_RATE)):
        t=i/SAMPLE_RATE
        fi=min(1.0,(t-6)/2.0); fo=min(1.0,(38-t)/3.0) if t>35 else 1.0
        bp=(t*0.92)%1
        pulse=sine(55+(1-bp)*8,t)*fi*fo*(1-bp**4)*0.06
        L[i]+=pulse; R[i]+=pulse

    # Layer 4: Vinyl warmth texture
    for i in range(int(8*SAMPLE_RATE), int(39*SAMPLE_RATE)):
        t=i/SAMPLE_RATE
        fi=min(1.0,(t-8)/3.0); fo=min(1.0,(39-t)/2.0) if t>37 else 1.0
        nv,seed=soft_noise(seed)
        tx=nv*0.015*fi*fo; L[i]+=tx; R[i]+=tx*(0.8+0.2*(i%3)/2.0)

    # Master limiter
    peak=max(max(abs(v)for v in L),max(abs(v)for v in R))
    if peak>0.92:
        s=0.92/peak
        for i in range(total): L[i]*=s; R[i]*=s

    write_wav(OUTPUT, L, R)
    print(f"Audio: {OUTPUT} ({DURATION}s, {SAMPLE_RATE}Hz, stereo)")
    return OUTPUT

if __name__=="__main__":
    generate()
