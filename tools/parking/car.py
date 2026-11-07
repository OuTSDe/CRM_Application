import json,math,sys
def deboor(k,x,t,c,p):
    d=[c[j+k-p] for j in range(p+1)]
    for r in range(1,p+1):
        for j in range(p,r-1,-1):
            den=t[j+1+k-r]-t[j+k-p]
            a=0 if den==0 else (x-t[j+k-p])/den
            d[j]=((1-a)*d[j-1][0]+a*d[j][0],(1-a)*d[j-1][1]+a*d[j][1])
    return d[p]
def sample(e,n_per=6):
    c=[(q['x'],q['y']) for q in e['controlPoints']]; t=e['knots']; p=e['degree']
    if not c: 
        return [(q['x'],q['y']) for q in e['fitPoints']]
    if len(t)!=len(c)+p+1: return c
    out=[]
    for k in range(p,len(c)):
        a,b=t[k],t[k+1]
        if b<=a: continue
        for i in range(n_per):
            out.append(deboor(k,a+(b-a)*i/n_per,t,c,p))
    out.append(deboor(len(c)-1,t[len(c)]-1e-9,t,c,p))
    return out
def simplify(pts,tol):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1e-9
    i,dm=0,0
    for j in range(1,len(pts)-1):
        d=abs(dy*(pts[j][0]-a[0])-dx*(pts[j][1]-a[1]))/L if L>1e-9 else math.hypot(pts[j][0]-a[0],pts[j][1]-a[1])
        if d>dm: i,dm=j,d
    if dm>tol: return simplify(pts[:i+1],tol)[:-1]+simplify(pts[i:],tol)
    return [a,b]
f=sys.argv[1]; db=json.load(open(f+'.json')); E=db['entities']
outers=[]
for e in E:
    if e['layer']=='outer':
        pts=sample(e); xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
        outers.append((max(ys)-min(ys),min(xs),max(xs),min(ys),max(ys)))
top=max(outers)   # widest view in y is the plan (mirrors)
_,x0,x1,y0,y1=top
cx,cy=(x0+x1)/2,(y0+y1)/2
paths={'outer':[],'inner':[]}
for e in E:
    if e['type']=='SPLINE': pts=sample(e)
    elif e['type']=='POLYLINE2D': pts=[(q['x'],q['y']) for q in e['vertices']]+([(e['vertices'][0]['x'],e['vertices'][0]['y'])] if e.get('flag',0)&1 else [])
    else: continue
    if not pts: continue
    if not all(x0-50<=q[0]<=x1+50 and y0-50<=q[1]<=y1+50 for q in pts): continue
    pts=[((q[0]-cx)/1000,(cy-q[1])/1000) for q in pts]
    pts=simplify(pts,0.012)
    if len(pts)<2: continue
    paths['outer' if e['layer']=='outer' else 'inner'].append('M'+' '.join('%.2f %.2f'%q for q in pts))
L=(x1-x0)/1000; W=(y1-y0)/1000
res={'L':round(L,2),'W':round(W,2),'outer':''.join(paths['outer']),'inner':''.join(paths['inner'])}
print(f[:12],res['L'],res['W'],len(res['outer']),len(res['inner']),len(paths['inner']))
json.dump(res,open(f[:12]+'_top.json','w'))
