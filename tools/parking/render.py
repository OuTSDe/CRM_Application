import json,re,math,sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
db=json.load(open('db.json'))
E=[e for e in db['entities'] if e.get('ownerBlockRecordSoftId')=='2']
TB={'GF':-2156091,'FF':-2155931,'2F':-2155779,'3F':-2155629,'4F':-2155475,'5F':-2155324}
keys=list(TB); xs=[TB[k] for k in keys]
def sheet(x):
    for k in keys:
        if x<TB[k]+6: return k
    return None
def p(e):
    q=e.get('insertionPoint') or e.get('startPoint') or e.get('center')
    if q: return q
    v=e.get('vertices')
    if v: return v[0]
json.dump(None,open('/dev/null','w'))
import pickle
out={}
for e in E:
    q=p(e)
    if not q: continue
    s=sheet(q['x'])
    out.setdefault(s,[]).append(e)
pickle.dump(out,open('sheets.pkl','wb'))
for k,v in out.items(): print(k,len(v))
