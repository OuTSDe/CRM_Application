import json,math,pickle,re
S=pickle.load(open('sheets.pkl','rb'))
d=json.load(open('inv1.json')); inv=d['inv']; fixes=d['fixes']
bg=json.load(open('bg.json'))
LOBBY={'GF':(-2156193.6,1703264.0),'FF':(-2156002.2,1703263.7),'2F':(-2155850.3,1703263.6),'3F':(-2155700.7,1703263.6)}
CODE={'GF':'G','FF':'L1','2F':'L2','3F':'L3'}
NAME={'GF':'Ground floor','FF':'First floor','2F':'Second floor','3F':'Third floor'}
FFL={'GF':'+4.860','FF':'+8.310','2F':'+11.335','3F':'+14.360'}
cl=lambda t: re.sub(r'\\[A-Za-z][^;]*;|[{}]|\\P',' ',t).strip()
def pid(code,no):
    m=re.fullmatch(r'(\d+)(A?)',no)
    return f"{code}-{int(m.group(1)):03d}{m.group(2)}" if m else f"{code}-{no}"
res_or,_=pickle.load(open('orient.pkl','rb'))
slots=[]
for i in inv:
    k=i['k']; b=bg[k]; lx,ly=LOBBY[k]
    walk=math.hypot(i['x']-lx,i['y']-ly)
    s={'id':pid(CODE[k],i['no']),'level':CODE[k],'no':i['no'],'kind':i['kind'],'x':round(i['x']-b['x0'],1),'y':round(b['y1']-i['y'],1),'walk':round(walk)}
    if i.get('pair'): s['pair']=pid(CODE[k],i['pair'])
    o=res_or.get((k,i['no']))
    if o:
        (cxw,cyw),a,_d=o
        cx=cxw-b['x0']; cy=b['y1']-cyw
        ax,ay=math.cos(a),-math.sin(a)          # car axis in plan (y down)
        vx,vy=cx-s['x'],cy-s['y']               # number (aisle end) towards the bay centre = nose-in direction
        if ax*vx+ay*vy<0: ax,ay=-ax,-ay
        s['cx']=round(cx,2); s['cy']=round(cy,2); s['a']=round(math.degrees(math.atan2(ay,ax))+180)%360   # car symbols have the nose at -x
    slots.append(s)
# open bays on the ground
G=S['GF']; b=bg['GF']
P=[]
for e in G:
    if e['layer']=='LA-PARKING' and e['type']=='LWPOLYLINE':
        v=e['vertices']; P.append((sum(q['x'] for q in v)/len(v), sum(q['y'] for q in v)/len(v)))
def zone(x,y):
    X=x+2156000; Y=y-1703000
    if X<-262: return 'S'
    if Y>258 and X<-200: return 'V'
    if Y>268: return 'V'
    return 'S'
vis=sorted([p for p in P if zone(*p)=='V'],key=lambda p:p[0]); sur=sorted([p for p in P if zone(*p)=='S'],key=lambda p:(p[0]))
assert len(vis)==36 and len(sur)==26,(len(vis),len(sur))
lx,ly=LOBBY['GF']
for n,(x,y) in enumerate(vis,1): slots.append({'id':f'V-{n:02d}','level':'G','no':f'V{n}','kind':'Visitor','x':round(x-b['x0'],1),'y':round(b['y1']-y,1),'walk':round(math.hypot(x-lx,y-ly)),'ev': 'Yes' if n<=20 else ''})
for n,(x,y) in enumerate(sur,1): slots.append({'id':f'S-{n:02d}','level':'G','no':f'S{n}','kind':'Surface','x':round(x-b['x0'],1),'y':round(b['y1']-y,1),'walk':round(math.hypot(x-lx,y-ly))})
tw=[(cl(e['text']),e['insertionPoint']) for e in G if e['layer']=='SCOOTER' and e['type']=='MTEXT']
for t,q in sorted(tw,key=lambda a:int(a[0])):
    slots.append({'id':f'TW-{int(t):02d}','level':'G','no':t,'kind':'Two-wheeler','x':round(q['x']-b['x0'],1),'y':round(b['y1']-q['y'],1),'walk':round(math.hypot(q['x']-lx,q['y']-ly))})
levels=[]
for k in ['GF','FF','2F','3F']:
    b=bg[k]; lx,ly=LOBBY[k]
    levels.append({'code':CODE[k],'name':NAME[k],'ffl':FFL[k],'w':b['w'],'h':b['h'],'lobby':[round(lx-b['x0'],1),round(b['y1']-ly,1)],'paths':b['paths']})
import collections
print(collections.Counter((s['level'],s['kind']) for s in slots))
print(len(slots))
cars={}
for key,f in [('suv','12989026-bmw'),('sedan','d9835658-mer')]:
    cars[key]=json.load(open(f+'_top.json'))
src={'cars':cars,'drawing':'YAMUNA - PARKING FLOORS - 24.07.2026.dwg (sheets A2-01 to A2-04, CD-R0/R1)','levels':levels,'slots':slots,'fixes':[{'level':f[0],'drawing':f[1],'now':f[2],'why':f[3]} for f in fixes]}
js='// Generated from the architect\'s parking drawings (YAMUNA - PARKING FLOORS - 24.07.2026.dwg) on 8 Nov 2026.\n// Slot numbers are the drawing numbers, prefixed by level. x, y and walk are metres in plan; walk is the straight-line\n// distance from the slot to the tower lobby entry on that level. Regenerate with tools/parking_from_dwg.mjs + .py.\nexport const PARKING_SOURCE = '+json.dumps(src,separators=(',',':'))+'\n'
open('parkingData.js','w').write(js)
print(len(js))
