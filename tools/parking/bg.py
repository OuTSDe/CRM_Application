import json,pickle,math,re
db=json.load(open('db.json'))
S=pickle.load(open('sheets.pkl','rb'))
B={b['name']:b for b in db['tables']['BLOCK_RECORD']['entries']}
GROUP={'struct':{'a-wall','A-Strl. wall','A- NEW COLUMNS','LA-WALL','A-FASADE WALL','A-LOW WALL'},
       'bay':{'A-CARS','A-CAR PARK','LA-PARKING'},
       'drive':{'A-drivewayline','A-RAMP'},
       'core':{'A-STAIR'}}
def grp(layer):
    for g,s in GROUP.items():
        if layer in s: return g
def segs_of(e, T, layer_override=None, depth=0):
    """yield (group, [(x,y),...]) in world coords; T = function(x,y)->(x,y)"""
    L=e['layer'] if e['layer']!='0' or not layer_override else layer_override
    t=e['type']
    if t=='INSERT':
        b=B.get(e['name']); 
        if not b or depth>4: return
        ip=e['insertionPoint']; sx=e.get('xScale',1) or 1; sy=e.get('yScale',1) or 1; r=e.get('rotation',0); bp=b.get('basePoint',{'x':0,'y':0})
        c,s=math.cos(r),math.sin(r)
        def T2(x,y,T=T):
            x=(x-bp['x'])*sx; y=(y-bp['y'])*sy
            return T(ip['x']+x*c-y*s, ip['y']+x*s+y*c)
        for ce in b.get('entities',[]):
            yield from segs_of(ce,T2,L,depth+1)
        return
    g=grp(L)
    if not g: return
    if t=='LINE':
        a,b2=e['startPoint'],e['endPoint']; yield g,[T(a['x'],a['y']),T(b2['x'],b2['y'])]
    elif t=='LWPOLYLINE':
        v=[T(q['x'],q['y']) for q in e['vertices']]
        if e.get('flag',0)&1 and len(v)>2: v.append(v[0])
        yield g,v
    elif t=='ARC':
        c=e['center']; R=e['radius']; a0=e['startAngle']; a1=e['endAngle']
        if a1<a0: a1+=2*math.pi
        n=max(2,int((a1-a0)/0.2))
        yield g,[T(c['x']+R*math.cos(a0+(a1-a0)*i/n), c['y']+R*math.sin(a0+(a1-a0)*i/n)) for i in range(n+1)]
    elif t=='CIRCLE' and L=='A- NEW COLUMNS':
        c=e['center']; R=e['radius']; yield g,[T(c['x']+R*math.cos(2*math.pi*i/12),c['y']+R*math.sin(2*math.pi*i/12)) for i in range(13)]
inv=json.load(open('inv1.json'))
out={}
for k in ['GF','FF','2F','3F']:
    pts=[(i['x'],i['y']) for i in inv['inv'] if i['k']==k]
    if k=='GF':
        pass
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    M=14 if k!='GF' else 12
    x0,x1,y0,y1=min(xs)-M,max(xs)+M,min(ys)-M,max(ys)+M
    if k=='GF': x0,x1,y0,y1=-2156268,-2156118,1703205,1703295   # include visitor/surface bays
    else: y1=max(y1,1703268)  # include the lobby
    W,H=x1-x0,y1-y0
    T=lambda x,y:(x-x0, y1-y)
    paths={g:[] for g in GROUP}
    for e in S[k]:
        for g,v in segs_of(e,T):
            if all(not(0<=p[0]<=W and 0<=p[1]<=H) for p in v): continue
            v=[(min(max(p[0],-1),W+1),min(max(p[1],-1),H+1)) for p in v]
            d='M'+' '.join('%.1f %.1f'%p for p in v)
            paths[g].append(d)
    out[k]={'x0':x0,'y1':y1,'w':round(W,1),'h':round(H,1),'paths':{g:''.join(p) for g,p in paths.items()}}
    print(k,round(W),round(H),{g:len(''.join(p)) for g,p in paths.items()})
json.dump(out,open('bg.json','w'))
