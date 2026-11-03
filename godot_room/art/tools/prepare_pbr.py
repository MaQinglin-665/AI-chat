"""Deterministic CC0 material variants; original downloads remain unmodified."""
from pathlib import Path
from PIL import Image, ImageOps, ImageStat
root=Path(__file__).resolve().parents[1]/"assets"
out=root/"derived";out.mkdir(exist_ok=True)
for asset,mean,contrast in [("rough_linen",218,.22),("white_plaster_02",232,.12)]:
 source=root/"materials"/asset/(asset+"_diff_1k.jpg")
 lum=ImageOps.grayscale(Image.open(source));average=ImageStat.Stat(lum).mean[0]
 lum=lum.point(lambda v:max(0,min(255,int(mean+(v-average)*contrast))))
 Image.merge("RGB",(lum,lum,lum)).save(out/(asset+"_neutral.jpg"),quality=94)
rough=Image.open(root/"materials/wood_floor/wood_floor_rough_2k.jpg").convert("L")
rough.point(lambda v:220+int(v*25/255)).save(out/"wood_floor_matte.jpg",quality=92)
# Retain the sofa's carved walnut frame; recolor only the low-chroma leather atlas.
source=Image.open(root/"models/sofa_02/textures/sofa_02_diff_1k.jpg").convert("RGB")
result=[]
for r,g,b in source.getdata():
 hi=max(r,g,b);lo=min(r,g,b)
 neutral=not (r>g*1.35 and g>b*1.10)
 if neutral:
  shade=.74+.26*(.2126*r+.7152*g+.0722*b)/160
  result.append(tuple(min(255,int(c*shade)) for c in (224,196,207)))
 else:result.append((r,g,b))
source.putdata(result);source.save(out/"sofa_rose.jpg",quality=94)
