import pickle,re,math,json,collections
S=pickle.load(open('sheets.pkl','rb'))
R=json.load(open('slots_raw.json'))
cl=lambda t: re.sub(r'\\[A-Za-z][^;]*;|[{}]|\\P',' ',t).strip()
LOBBY={'GF':(-2156193.6,1703264.0),'FF':(-2156002.2,1703263.7),'2F':(-2155850.3,1703263.6),'3F':(-2155700.7,1703263.6)}
CODE={'GF':'G','FF':'L1','2F':'L2','3F':'L3'}
NAME={'GF':'Ground','FF':'Level 1','2F':'Level 2','3F':'Level 3'}
FFL={'GF':'+4.86','FF':'+8.31','2F':'+11.34','3F':'+14.36'}
fixes=[]
def fix(k,s):
    L=s['label']
    if k=='GF' and L in('76A','77A'):
        # duplicates: the pair at x=-2156197.3 / -2156194.5 sits behind 74 / 73
        if abs(s['x']-(-2156197.3))<0.3: fixes.append(('G','76A (2nd)','74A','behind 74, duplicate label')); return '74A'
        if abs(s['x']-(-2156194.5))<0.3: fixes.append(('G','77A (2nd)','73A','behind 73, duplicate label')); return '73A'
    if k=='FF' and L in('96','97','98','99') and s['y']<1703215:
        fixes.append(('L1',L+' (2nd)',L+'A','rear row behind %s, duplicate label'%L)); return L+'A'
    if k=='3F' and L=='46A': fixes.append(('L3','46A','44A','sits behind 44; 46 is a single by the ramp')); return '44A'
    if k=='2F' and L=='721': fixes.append(('L2','721','72A','typo')); return '72A'
    return L
inv=[]; 
for k in ['GF','FF','2F','3F']:
    lx,ly=LOBBY[k]
    for s in R[k]:
        L=fix(k,s)
        inv.append({'k':k,'no':L,'x':s['x'],'y':s['y']})
# pairs
by={(i['k'],i['no']):i for i in inv}
assert len(by)==len(inv), collections.Counter((i['k'],i['no']) for i in inv).most_common(3)
for i in inv:
    m=re.fullmatch(r'(\d+)A',i['no'])
    if m:
        f=by.get((i['k'],m.group(1)))
        assert f, i
        d=math.hypot(f['x']-i['x'],f['y']-i['y'])
        if d>6.5: print('far pair',i['k'],i['no'],round(d,2))
        i['kind']='Tandem rear'; i['pair']=m.group(1); f['kind']='Tandem front'; f['pair']=i['no']; i['pd']=round(d,2)
for i in inv:
    i.setdefault('kind','Accessible' if i['no'].startswith('H') else 'Single')
print(collections.Counter((i['k'],i['kind']) for i in inv))
print('pair dist', sorted(set(i.get('pd') for i in inv if i.get('pd'))))
print(fixes)
json.dump({'inv':inv,'fixes':fixes},open('inv1.json','w'))
