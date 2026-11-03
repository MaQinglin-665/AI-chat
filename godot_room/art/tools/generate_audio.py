"""Original synthesized room sounds. Dedicated to CC0-1.0; no samples used."""
from pathlib import Path
import math, random, struct, wave
out=Path(__file__).resolve().parents[1]/"audio"
out.mkdir(exist_ok=True)
rate=22050
for name,seconds in [("city",16),("air",8),("lamp-click",.12)]:
 rng=random.Random(724)
 count=int(rate*seconds)
 data=[]
 low=0.0
 for i in range(count):
  t=i/rate
  low=.985*low+.015*rng.uniform(-1,1)
  if name=="city":
   # Soft loop edges and distant traffic-like swells; no recognizable voices.
   value=low*.5+.018*math.sin(2*math.pi*63*t)*(1+.35*math.sin(2*math.pi*t/seconds))
  elif name=="air":value=low*.30+.009*math.sin(2*math.pi*55*t)
  else:value=(rng.uniform(-1,1)*.24+math.sin(t*5700)*.12)*math.exp(-t*65)
  if name!="lamp-click":value*=min(1,t/.05,(seconds-t)/.05)
  data.append(struct.pack("<h",int(max(-1,min(1,value))*32767)))
 with wave.open(str(out/(name+".wav")),"wb") as stream:
  stream.setparams((1,2,rate,count,"NONE","not compressed"));stream.writeframes(b"".join(data))
 print(name,count*2)
