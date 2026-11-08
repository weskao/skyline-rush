#!/usr/bin/env python3
"""Native-3x transparent HUD artwork masters (no cropped source resampling).

Each icon is drawn directly at its final raster resolution, with a complete
silhouette, vivid enamel/metallic layers, specular light and restrained glow.
The six button images intentionally have no baked text: localised UI is DOM.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from pathlib import Path
import math

OUT = Path('public/feature-assets/mobile-controls-hud/raster')
ARTS = {
 'button-back':'cyan','button-coming-soon':'amber','button-garage':'azure',
 'button-nitro':'violet','button-play':'teal','button-retry':'gold',
 'hud-brake':'red','hud-combo':'gold','hud-drift':'magenta','hud-nitro':'violet',
 'hud-pause':'azure','hud-speed':'teal','ui-arrow-left':'cyan','ui-arrow-right':'cyan',
 'ui-close':'red','ui-info':'azure','ui-settings':'violet','ui-tooltip':'gold',
}
PALETTE = {
 'cyan':((30,220,255),(135,244,255)), 'amber':((255,153,53),(255,230,130)),
 'azure':((67,143,255),(167,222,255)), 'violet':((166,87,255),(235,187,255)),
 'teal':((43,236,189),(172,255,222)), 'gold':((246,178,59),(255,248,167)),
 'red':((255,87,102),(255,186,177)), 'magenta':((255,91,206),(255,185,237)),
}
def layer(size): return Image.new('RGBA',size,(0,0,0,0))
def mix(a,b,t): return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))
def glow(base,mask,rgba,blur=9):
    m=mask.filter(ImageFilter.GaussianBlur(blur))
    a=m.point(lambda v: round(v*rgba[3]/255))
    col=layer(base.size)
    col.paste((*rgba[:3],0),(0,0,base.width,base.height))
    col.putalpha(a)
    base.alpha_composite(col)
def fill_mask(base,mask,c1,c2):
    w,h=base.size
    gradient=layer((w,h));px=gradient.load()
    for y in range(h):
        for x in range(w):
            t=min(1,max(0,.24+.62*(x/w*.35+y/h*.65)))
            r,g,b=mix(c2,c1,t)
            sheen=round(14*math.sin(y/h*math.pi))
            px[x,y]=(min(255,r+sheen),min(255,g+sheen),min(255,b+sheen),mask.getpixel((x,y)))
    base.alpha_composite(gradient)
def glyph_mask(name,size,wide):
    w,h=size;m=Image.new('L',size);d=ImageDraw.Draw(m)
    x,y=(94,78) if wide else (w/2,h/2)
    s=.68 if wide else 1.0
    def P(points):
        d.polygon([(round(x+px*s),round(y+py*s)) for px,py in points],fill=255)
    def L(points,width=12):
        d.line([(round(x+px*s),round(y+py*s)) for px,py in points],
               fill=255,width=max(2,round(width*s)),joint='curve')
    def E(box,fill=255,width=0):
        a,b,c,e=box;B=(round(x+a*s),round(y+b*s),round(x+c*s),round(y+e*s))
        if width:d.ellipse(B,outline=fill,width=round(width*s))
        else:d.ellipse(B,fill=fill)
    def A(box,start,end,width=12):
        a,b,c,e=box
        d.arc((round(x+a*s),round(y+b*s),round(x+c*s),round(y+e*s)),
              start,end,fill=255,width=round(width*s))
    if name in ('button-back','ui-arrow-left'):
        L([(19,-31),(-17,0),(19,31)],16);L([(-15,0),(31,0)],13)
    elif name=='ui-arrow-right':
        L([(-19,-31),(17,0),(-19,31)],16);L([(-31,0),(15,0)],13)
    elif name=='button-play':
        P([(-18,-36),(39,0),(-18,36)])
    elif name=='button-retry':
        A((-37,-37,37,37),-55,235,13);P([(18,-43),(43,-42),(41,-14)])
    elif name=='button-coming-soon':
        L([(-22,-36),(22,-36)],9);L([(-22,36),(22,36)],9)
        P([(-21,-28),(21,-28),(9,-12),(0,-2),(-9,-12)])
        P([(-5,8),(5,8),(21,28),(-21,28)])
    elif name=='button-garage':
        P([(-43,4),(-24,-18),(21,-18),(39,5),(43,26),(-43,26)])
        E((-34,14,-14,34),fill=0);E((14,14,34,34),fill=0)
        L([(-41,-14),(-12,-36),(14,-36),(39,-14)],8)
    elif name in ('hud-nitro','button-nitro'):
        P([(-8,-46),(27,-13),(7,-12),(29,18),(-8,46),(-1,14),(-27,14)])
        L([(-37,19),(-21,7)],8);L([(24,-29),(34,-19)],7)
    elif name=='hud-brake':
        E((-38,-38,38,38),width=13);E((-19,-19,19,19),width=9)
        L([(-35,-20),(-48,-8)],10);L([(35,-20),(48,-8)],10)
        L([(-28,31),(-39,42)],8);L([(28,31),(39,42)],8)
    elif name=='hud-combo':
        E((-41,-13,8,36),width=12);E((-8,-36,41,13),width=12)
        L([(-8,3),(12,-14)],11);P([(-6,-46),(13,-29),(1,-25)])
    elif name=='hud-drift':
        A((-42,-40,39,41),-170,52,13);A((-22,-23,39,38),-165,55,10)
        P([(28,-49),(49,-32),(24,-22)]);L([(-45,28),(-24,41)],8)
    elif name=='hud-pause':
        d.rounded_rectangle((round(x-26*s),round(y-41*s),round(x-8*s),round(y+41*s)),radius=round(5*s),fill=255)
        d.rounded_rectangle((round(x+8*s),round(y-41*s),round(x+26*s),round(y+41*s)),radius=round(5*s),fill=255)
    elif name=='hud-speed':
        A((-46,-35,46,56),182,358,13);L([(0,12),(27,-28)],10);E((-8,4,8,20))
        for u in [-34,-17,0,17,34]:L([(u,-1),(u,-6)],4)
    elif name=='ui-close':
        L([(-29,-29),(29,29)],17);L([(29,-29),(-29,29)],17)
    elif name=='ui-info':
        E((-42,-42,42,42),width=11);E((-6,-27,6,-15));L([(0,-1),(0,26)],12)
    elif name=='ui-settings':
        for k in range(8):
            a=k*math.pi/4
            P([(rr*math.cos(a+dd),rr*math.sin(a+dd))
                for rr,dd in [(31,-.13),(46,-.13),(46,.13),(31,.13)]])
        E((-35,-35,35,35));E((-16,-16,16,16),fill=0)
    elif name=='ui-tooltip':
        d.rounded_rectangle((round(x-43*s),round(y-30*s),round(x+43*s),round(y+22*s)),
                            radius=round(13*s),fill=255)
        P([(-23,20),(-24,43),(-2,20)])
        for xx in [-22,0,22]:E((xx-4,-7,xx+4,1),fill=0)
    else: raise ValueError(name)
    return m
def make(name,tone):
    wide=name.startswith('button-')
    w,h=(432,156) if wide else (216,216)
    a,b=PALETTE[tone];im=layer((w,h))
    background=Image.new('L',(w,h));bd=ImageDraw.Draw(background)
    if wide:
        outer=[(39,35),(380,35),(401,53),(401,105),(380,122),(39,122),(23,106),(23,52)]
        inner=[(42,41),(377,41),(393,55),(393,102),(376,114),(42,114),(31,102),(31,55)]
    else:
        outer=[(108,26),(150,35),(181,66),(190,108),(181,150),(150,181),
               (108,190),(66,181),(35,150),(26,108),(35,66),(66,35)]
        inner=[(108,36),(145,44),(172,71),(180,108),(172,145),(145,172),
               (108,180),(71,172),(44,145),(36,108),(44,71),(71,44)]
    bd.polygon(outer,fill=255)
    glow(im,background,(*a,90),blur=7)
    glow(im,ImageChops.offset(background,0,5),(3,6,24,145),blur=4)
    body=layer((w,h))
    base=Image.new('RGBA',(w,h),(9,19,43,0));base.putalpha(background)
    body.alpha_composite(base)
    d=ImageDraw.Draw(body)
    d.line(outer+[outer[0]],fill=(*a,230),width=4,joint='curve')
    d.polygon(inner,fill=(17,30,58,241))
    d.line(inner+[inner[0]],fill=(*b,125),width=2,joint='curve')
    if wide:
        d.line([(47,45),(371,45)],fill=(*b,100),width=2)
        d.line([(52,111),(369,111)],fill=(*a,115),width=2)
        for k in range(3):
            d.line([(175+k*32,68),(195+k*32,68)],fill=(*a,85+k*18),width=3)
            d.line([(175+k*32,83),(236+k*32,83)],fill=(*b,65),width=2)
        d.line([(350,54),(370,54)],fill=(*b,170),width=3)
    else:
        d.arc((43,43,173,173),205,322,fill=(*b,130),width=3)
        d.arc((47,47,169,169),16,122,fill=(*a,80),width=2)
        d.ellipse((63,63,153,153),outline=(*a,55),width=3)
    im.alpha_composite(body)
    m=glyph_mask(name,(w,h),wide)
    glow(im,m,(*a,135),blur=9)
    glow(im,ImageChops.offset(m,1,5),(0,2,14,230),blur=3)
    extrude=layer((w,h))
    fill_mask(extrude,ImageChops.offset(m,1,5),tuple(max(0,int(v*.33)) for v in a),a)
    im.alpha_composite(extrude)
    front=layer((w,h));fill_mask(front,m,a,b);im.alpha_composite(front)
    top=ImageChops.subtract(m,ImageChops.offset(m,0,3))
    light=layer((w,h));light.paste((247,255,255,0),(0,0,w,h))
    light.putalpha(top.point(lambda v: round(v*.7)));im.alpha_composite(light)
    # Safety margin is real transparency, not CSS clipping or a resized crop.
    clip=Image.new('L',(w,h))
    ImageDraw.Draw(clip).rectangle((21,21,w-22,h-22),fill=255)
    im.putalpha(ImageChops.multiply(im.getchannel('A'),clip))
    return im
def check(im,name):
    pixels=im.getchannel('A').point(lambda v:255 if v>16 else 0)
    box=pixels.getbbox();w,h=im.size
    assert box is not None,(name,'empty')
    assert box[0]>=20 and box[1]>=20 and w-box[2]>=20 and h-box[3]>=20,(name,box)
    assert (w,h)==((432,156) if name.startswith('button-') else (216,216)),name
    return box
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for name,tone in ARTS.items():
        im=make(name,tone);box=check(im,name)
        path=OUT/f'{name}@3x.webp'
        im.save(path,'WEBP',quality=94,method=6,exact=True)
        decoded=Image.open(path).convert('RGBA')
        assert check(decoded,name)==box,(name,'decoded bounds')
        print(f'{path}: {decoded.width}x{decoded.height}, alpha={box}')
if __name__=='__main__':main()
