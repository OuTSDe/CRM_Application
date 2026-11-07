# Step 3: pair every slot circle (layer "car no") with its number (TEXT or MTEXT on the same layer). Writes slots_raw.json.
import pickle,re,math,json,collections
S=pickle.load(open('sheets.pkl','rb'))
clean=lambda t: re.sub(r'\\[A-Za-z][^;]*;|[{}]','',t).strip()
res={}
for k in ['GF','FF','2F','3F']:
    v=S[k]
    C=[e for e in v if e['type']=='CIRCLE' and e['layer']=='car no']
    T=[(clean(e['text']),(e.get('startPoint') if e['type']=='TEXT' else e['insertionPoint'])) for e in v if e['type'] in('TEXT','MTEXT') and e['layer']=='car no' and len(clean(e['text']))<=4]
    slots=[]
    for c in C:
        cx,cy=c['center']['x'],c['center']['y']
        d,lab=min((math.hypot(q['x']-cx,q['y']-cy),l) for l,q in T)
        slots.append({'label':lab,'x':cx,'y':cy,'d':round(d,2)})
    u=collections.Counter(s['label'] for s in slots)
    print(k,len(slots),'max label distance',max(s['d'] for s in slots),'duplicates',[x for x,c in u.items() if c>1])
    res[k]=slots
json.dump(res,open('slots_raw.json','w'))
