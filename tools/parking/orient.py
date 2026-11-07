import json,pickle,math
db=json.load(open('db.json')); S=pickle.load(open('sheets.pkl','rb'))
B={b['name']:b for b in db['tables']['BLOCK_RECORD']['entries']}
inv=json.load(open('inv1.json'))['inv']
def block_pts(name,depth=0):
    b=B.get(name); out=[]
    if not b: return out
    for e in b.get('entities',[]):
        if e['type']=='LINE': out+= [(e['startPoint']['x'],e['startPoint']['y']),(e['endPoint']['x'],e['endPoint']['y'])]
        elif e['type']=='LWPOLYLINE': out+=[(q['x'],q['y']) for q in e['vertices']]
    return out
def axis(pts):
    n=len(pts); mx=sum(p[0] for p in pts)/n; my=sum(p[1] for p in pts)/n
    sxx=sum((p[0]-mx)**2 for p in pts); syy=sum((p[1]-my)**2 for p in pts); sxy=sum((p[0]-mx)*(p[1]-my) for p in pts)
    a=0.5*math.atan2(2*sxy,sxx-syy)
    # extents along axis
    u=[(p[0]-mx)*math.cos(a)+(p[1]-my)*math.sin(a) for p in pts]; v=[-(p[0]-mx)*math.sin(a)+(p[1]-my)*math.cos(a) for p in pts]
    L=max(u)-min(u); W=max(v)-min(v)
    c=(mx+math.cos(a)*(max(u)+min(u))/2-math.sin(a)*(max(v)+min(v))/2, my+math.sin(a)*(max(u)+min(u))/2+math.cos(a)*(max(v)+min(v))/2)
    return a,L,W,c
cands={}
for k in ['GF','FF','2F','3F']:
    C=[]
    for e in S[k]:
        if e['layer']!='A-CARS': continue
        if e['type']=='INSERT':
            pts=block_pts(e['name'])
            if len(pts)<3: continue
            ip=e['insertionPoint']; sx=e.get('xScale',1) or 1; sy=e.get('yScale',1) or 1; r=e.get('rotation',0)
            bp=B[e['name']].get('basePoint',{'x':0,'y':0})
            W=[(ip['x']+((x-bp['x'])*sx)*math.cos(r)-((y-bp['y'])*sy)*math.sin(r), ip['y']+((x-bp['x'])*sx)*math.sin(r)+((y-bp['y'])*sy)*math.cos(r)) for x,y in pts]
        elif e['type']=='LWPOLYLINE':
            W=[(q['x'],q['y']) for q in e['vertices']]
        else: continue
        a,L,Wd,c=axis(W)
        if 3.5<L<7 and 1.5<Wd<3.6: C.append((c,a,L,Wd))
    cands[k]=C
    print(k,len(C))
res={}; miss=[]
for s in inv:
    C=cands[s['k']]
    best=min(C,key=lambda c: math.hypot(c[0][0]-s['x'],c[0][1]-s['y'])) if C else None
    d=math.hypot(best[0][0]-s['x'],best[0][1]-s['y']) if best else 99
    if d<3.2: res[(s['k'],s['no'])]=(best[0],best[1],d)
    else: miss.append((s['k'],s['no'],round(d,1)))
print('matched',len(res),'missing',len(miss),miss[:30])
pickle.dump((res,miss),open('orient.pkl','wb'))
