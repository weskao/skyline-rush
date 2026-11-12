#!/usr/bin/env python3
"""Deterministic multi-layer metallic 3x WebP artwork for Wave 3."""
from pathlib import Path
from math import cos, sin, pi
from PIL import Image, ImageDraw, ImageFilter

S = 3
ROOT = Path(__file__).resolve().parents[1] / 'public/feature-assets'
REWARDS = ('mission-race', 'mission-time', 'mission-drift', 'mission-combo',
           'trophy-bronze', 'trophy-silver', 'trophy-gold', 'trophy-platinum')
WALLET = ('wallet-coin', 'wallet-diamond')
COLORS = {
    'mission-race': ((35, 233, 255), (14, 91, 217)),
    'mission-time': ((47, 248, 240), (29, 117, 224)),
    'mission-drift': ((255, 97, 238), (105, 41, 210)),
    'mission-combo': ((255, 212, 91), (230, 98, 37)),
    'trophy-bronze': ((255, 186, 119), (143, 66, 44)),
    'trophy-silver': ((228, 250, 255), (91, 131, 176)),
    'trophy-gold': ((255, 237, 119), (204, 105, 30)),
    'trophy-platinum': ((200, 255, 255), (67, 138, 227)),
    'wallet-coin': ((255, 232, 121), (224, 124, 34)),
    'wallet-diamond': ((156, 250, 255), (37, 99, 232)),
}

def mix(a, b, t):
    return tuple(round(x*(1-t)+y*t) for x,y in zip(a,b))

class Painter:
    def __init__(self):
        self.im = Image.new('RGBA',(288*S,288*S),(0,0,0,0))
        self.d = ImageDraw.Draw(self.im,'RGBA')
    def pt(self, box):
        return tuple(round(n*S) for n in box)
    def oval(self,box,color,width=0):
        if width: self.d.ellipse(self.pt(box),outline=(*color[:3],color[3] if len(color)>3 else 255),width=width*S)
        else: self.d.ellipse(self.pt(box),fill=(*color[:3],color[3] if len(color)>3 else 255))
    def poly(self,pts,color):
        self.d.polygon([(round(x*S),round(y*S)) for x,y in pts],fill=(*color[:3],color[3] if len(color)>3 else 255))
    def lines(self,pts,color,width=2):
        self.d.line([(round(x*S),round(y*S)) for x,y in pts],fill=(*color[:3],color[3] if len(color)>3 else 255),width=round(width*S),joint='curve')
    def arc(self,box,start,end,color,width=3):
        self.d.arc(self.pt(box),start,end,fill=(*color[:3],color[3] if len(color)>3 else 255),width=width*S)
    def glow(self,box,color,blur=9,opacity=90):
        layer=Image.new('RGBA',self.im.size)
        ImageDraw.Draw(layer,'RGBA').ellipse(self.pt(box),fill=(*color,opacity))
        self.im.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur*S)))
        self.d=ImageDraw.Draw(self.im,'RGBA')
    def star(self,x,y,r,c):
        pts=[(x+cos(-pi/2+i*pi/5)*(r if i%2==0 else r*.36),
              y+sin(-pi/2+i*pi/5)*(r if i%2==0 else r*.36)) for i in range(10)]
        self.poly(pts,c)

def frame(p,b,d):
    p.glow((63,50,225,231),b,15,95)
    p.glow((101,70,195,177),d,11,115)
    p.oval((49,201,239,254),(5,8,29,83))
    for i in range(14):
        p.oval((48+i*.85,31+i*.8,240-i*.85,223-i*.8),(*mix(b,d,i/17),round(36+i*7)))
    p.oval((61,44,227,210),(8,19,53,255))
    p.oval((66,49,222,205),(*mix(d,(12,15,48),.58),255))
    p.oval((77,60,211,194),(9,18,49,230))
    p.arc((56,39,232,216),198,332,(*b,250),5)
    p.arc((60,43,228,212),14,134,(*d,240),5)
    p.arc((84,66,205,188),190,300,(*b,115),2)
    p.lines([(86,69),(103,60),(129,54)],(245,253,255,130),3)
    for x,y,r in ((46,113,2),(240,123,2),(81,36,2),(207,37,3),(63,213,2),(235,207,2)):
        p.star(x,y,r,(*b,170))

def race(p,b,d):
    p.glow((54,115,232,179),b,6,95)
    p.poly([(81,134),(94,106),(166,100),(199,119),(216,139),(216,160),(74,160)],(*mix(b,(250,252,255),.18),255))
    p.poly([(91,130),(111,110),(164,108),(183,130)],(12,36,78,242))
    p.poly([(99,128),(115,113),(132,112),(127,128)],(57,202,250,220))
    p.poly([(137,112),(163,112),(175,129),(136,129)],(29,153,225,210))
    p.lines([(76,135),(211,135)],(*b,255),4)
    p.lines([(91,146),(203,146)],(250,253,255,175),3)
    for x in (104,186):
        p.oval((x-18,143,x+18,178),(4,12,36,255))
        p.oval((x-13,149,x+13,173),(*d,255))
        p.oval((x-7,155,x+7,169),(187,253,255,255))
        p.oval((x-3,158,x+3,164),(9,33,67,255))
    p.lines([(63,167),(92,167)],(*b,175),3)
    p.lines([(201,168),(229,168)],(*b,180),3)

def clock(p,b,d):
    p.glow((78,73,211,203),b,7,96)
    p.oval((89,77,201,189),(*d,255))
    p.oval((94,82,196,184),(*b,255))
    p.oval((101,89,189,177),(13,38,75,255))
    for i in range(12):
        a=(i*30-90)*pi/180
        p.lines([(145+cos(a)*38,133+sin(a)*38),(145+cos(a)*44,133+sin(a)*44)],
                (239,255,255,225),3 if i%3==0 else 2)
    p.lines([(145,106),(145,135),(168,150)],(252,255,255,255),6)
    p.lines([(145,110),(145,135)],(*b,255),2)
    p.oval((138,128,151,142),(*b,255))
    p.poly([(123,75),(127,66),(163,66),(169,75)],(*b,245))
    p.arc((93,81,197,185),199,293,(255,255,255,185),3)

def drift(p,b,d):
    p.glow((78,79,216,200),b,7,95)
    p.arc((62,60,224,226),208,346,(*b,230),7)
    p.arc((62,60,224,226),20,142,(*d,220),6)
    p.oval((97,85,193,181),(*d,255))
    p.oval((104,92,186,174),(11,23,50,255))
    p.oval((111,99,179,167),(*b,200))
    p.oval((119,107,171,159),(19,35,68,255))
    for i in range(5):
        a=-pi/2+i*2*pi/5
        p.lines([(145,133),(145+cos(a)*24,133+sin(a)*24)],(226,241,255,230),7)
    p.oval((137,125,153,141),(247,253,255,255))
    p.lines([(66,190),(105,182),(129,185)],(*b,180),4)
    p.lines([(178,78),(205,84),(223,98)],(*b,190),4)

def combo(p,b,d):
    for x,y in ((105,145),(145,119),(182,145)):
        p.glow((x-32,y-32,x+32,y+32),b,6,80)
        p.oval((x-25,y-25,x+25,y+25),(*d,250),6)
        p.oval((x-17,y-17,x+17,y+17),(*b,245),3)
        p.star(x,y,10,(255,253,229,245))
    p.lines([(86,168),(120,182),(161,181),(206,164)],(*b,180),4)
    p.lines([(115,86),(130,74),(150,74),(169,85)],(255,255,255,165),3)

def trophy(p,b,d):
    p.glow((86,85,207,205),b,8,80)
    for x,side in ((93,-1),(195,1)):
        p.arc((x-27,103,x+27,159),180 if side==-1 else 270,360 if side==-1 else 450,(*d,255),8)
        p.arc((x-26,101,x+25,157),180 if side==-1 else 270,360 if side==-1 else 450,(*b,230),3)
    p.poly([(102,92),(189,92),(180,145),(166,160),(125,160),(110,143)],(*d,255))
    p.poly([(108,98),(184,98),(175,142),(159,155),(130,155),(117,141)],(*b,255))
    p.poly([(108,99),(132,100),(124,144),(133,153),(116,140)],(255,255,255,125))
    p.poly([(176,102),(184,98),(175,142),(160,153),(172,138)],(*d,220))
    p.oval((99,86,191,104),(*d,255))
    p.oval((103,88,187,98),(*b,255))
    p.lines([(140,162),(151,162),(150,184),(139,184)],(*b,240),6)
    p.poly([(125,184),(167,184),(174,199),(118,199)],(*d,255))
    p.poly([(119,197),(173,197),(185,208),(108,208)],(*b,255))
    p.lines([(111,207),(183,207)],(255,255,255,190),3)
    p.star(146,123,18,(255,255,240,235))
    p.arc((107,97,182,155),188,246,(255,255,255,160),2)

def coin(p,b,d):
    frame(p,b,d)
    p.glow((90,88,201,197),b,6,96)
    for i in range(12):
        p.oval((91+i,86+i,201-i,196-i),(*mix(d,b,i/11),255))
    p.oval((101,96,191,186),(70,43,18,255))
    p.oval((108,103,184,179),(*b,255))
    p.poly([(151,107),(118,144),(139,145),(129,172),(173,132),(151,131)],(255,252,215,255))
    p.lines([(116,118),(132,108),(145,106)],(255,255,255,220),3)

def diamond(p,b,d):
    frame(p,b,d)
    p.glow((88,88,205,185),b,6,100)
    p.poly([(94,117),(118,96),(173,96),(199,120),(145,182)],(*b,250))
    p.poly([(94,117),(118,96),(131,122)],(238,255,255,235))
    p.poly([(118,96),(173,96),(164,121),(131,122)],(129,235,255,250))
    p.poly([(173,96),(199,120),(164,121)],(*d,255))
    p.poly([(94,117),(131,122),(145,182)],(34,160,211,255))
    p.poly([(131,122),(164,121),(145,182)],(200,255,255,248))
    p.poly([(164,121),(199,120),(145,182)],(34,96,218,255))
    p.lines([(95,117),(131,122),(164,121),(199,120)],(244,255,255,235),2)
    p.lines([(131,122),(145,182)],(115,217,255,165),2)
    p.star(122,104,8,(255,255,255,255))

def render(name,size):
    b,d=COLORS[name]
    p=Painter()
    if name=='wallet-coin': coin(p,b,d)
    elif name=='wallet-diamond': diamond(p,b,d)
    else:
        frame(p,b,d)
        if name.startswith('trophy-'): trophy(p,b,d)
        else: {'mission-race':race,'mission-time':clock,
               'mission-drift':drift,'mission-combo':combo}[name](p,b,d)
    p.arc((61,46,228,211),201,258,(255,255,255,130),2)
    p.star(203,70,6,(*b,205))
    return p.im.resize((size,size),Image.Resampling.LANCZOS)

def main():
    paths=[(n,288,ROOT/'garage-rewards-and-missions/raster') for n in REWARDS]
    paths += [(n,144,ROOT/'wave3-demo/raster') for n in WALLET]
    for name,size,directory in paths:
        directory.mkdir(parents=True,exist_ok=True)
        art=render(name,size)
        bbox=art.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()
        if not bbox or min(bbox[0],bbox[1],size-bbox[2],size-bbox[3])<size*.06:
            raise ValueError(f'{name}: cropped alpha {bbox}')
        dest=directory/f'{name}@3x.webp'
        art.save(dest,format='WEBP',quality=91,method=6,exact=True)
        print(f'{name}: {size}x{size} webp {dest.stat().st_size} bytes; alpha={bbox}')

if __name__=='__main__':
    main()
