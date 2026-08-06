#!/usr/bin/env python3
"""30s BGM — arc: tension → methodical → relaxed → energetic → resolve"""
import math, struct, wave, os

RATE = 48000; DUR = 30.0
OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "screencast-audio.wav")

def sine(f,t): return math.sin(2*math.pi*f*t)
def tri(f,t): p=(t*f)%1; return 4*abs(p-.5)-1
def ns(s): return ((s*1664525+1013904223)&0xFFFFFFFF)>>16

def write_wav(fn, L, R):
    n=min(len(L),len(R)); os.makedirs(os.path.dirname(fn),exist_ok=True)
    with wave.open(fn,"w") as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(RATE)
        for i in range(n):
            l=max(-1,min(1,L[i])); r=max(-1,min(1,R[i]))
            wf.writeframes(struct.pack("<hh",int(l*32767),int(r*32767)))

def gen():
    N=int(DUR*RATE); L=[0.0]*N; R=[0.0]*N; seed=42

    # ── Layer 1: Warm pad (Dm9) — entire track ──
    chord=[147,175,220,262,330]
    for i in range(N):
        t=i/RATE; env=1.0
        if t<2: env=t/2
        elif t>28: env=max(0,(30-t)/2)
        s=0.0
        for j,f in enumerate(chord):
            v=0.1/(j+1); d=1.0+0.0005*j
            trem=1.0+0.08*sine(.3,t+j*.5)
            s+=sine(f*d,t)*v*trem
        s*=env; L[i]+=s; R[i]+=s
        R[i]+=sine(220*1.002,t)*.025*env
        L[i]+=sine(262*.998,t)*.025*env

    # ── Layer 2: Sub-bass pulse — enters at 3s, builds slowly ──
    for i in range(int(3*RATE), int(29*RATE)):
        t=i/RATE; fi=min(1,(t-3)/2); fo=min(1,(29-t)/2) if t>27 else 1
        bp=(t*.88)%1; vol=fi*fo*(1-bp**3)*.07
        L[i]+=sine(55+(1-bp)*6,t)*vol
        R[i]+=sine(55+(1-bp)*6,t)*vol

    # ── Layer 3: Piano tones — key moments ──
    notes=[
        (0.3,196,.25),(1.2,262,.28),(2.0,330,.30),       # intake
        (3.8,294,.22),(3.9,330,.22),(4.0,392,.22),        # terminal entry
        (5.5,440,.20),(7.0,349,.18),(8.5,294,.15),        # typing
        (9.5,392,.22),(10,440,.20),                        # page entry
        (12,349,.15),(14,294,.12),(16,330,.14),            # scroll
        (18.8,440,.28),(19,523,.30),(19.2,587,.28),        # cast — build
        (20,659,.25),(21,523,.22),(22,440,.20),            # cast settle
        (25.3,392,.25),(25.5,523,.30),(26,659,.32),        # cta reveal
        (27,523,.22),(28,440,.15),                          # fade
    ]
    for tn,freq,vel in notes:
        nsamp=int(tn*RATE); nl=int(2.5*RATE)
        for j in range(nl):
            idx=nsamp+j
            if idx>=N: break
            tl=j/RATE
            et=(tl/.006) if tl<.006 else math.exp(-(tl-.006)*2.5)
            tone=(sine(freq,tl)+sine(freq*2,tl)*.22+sine(freq*3,tl)*.06)*et*vel*.5
            pan=.5+.5*math.sin(tn*.6)
            L[idx]+=tone*(1-pan+.3); R[idx]+=tone*(pan+.3)

    # ── Layer 4: Vinyl warmth texture ──
    for i in range(int(4*RATE), int(29*RATE)):
        t=i/RATE; fi=min(1,(t-4)/2); fo=min(1,(29-t)/2) if t>27 else 1
        nv=ns(seed)/32768; seed=(seed*1664525+1013904223)&0xFFFFFFFF
        tx=nv*.012*fi*fo; L[i]+=tx; R[i]+=tx*(.8+.2*(i%3)/2)

    # ── Master limiter ──
    peak=max(max(abs(v)for v in L),max(abs(v)for v in R))
    if peak>.92:
        s=.92/peak
        for i in range(N): L[i]*=s; R[i]*=s

    write_wav(OUT, L, R)
    print(f"BGM: {OUT} ({DUR}s, {RATE}Hz, stereo)")

if __name__=="__main__": gen()
