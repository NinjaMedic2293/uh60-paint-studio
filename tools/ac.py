import numpy as np, re
def rotm(h=0,p=0,r=0):
    h,p,r=np.radians([h,p,r]); cz,sz=np.cos(h),np.sin(h); cy,sy=np.cos(p),np.sin(p); cx,sx=np.cos(r),np.sin(r)
    Rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]); Ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]); Rx=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
    return Rz@Ry@Rx
def parse(path):
    L=open(path,encoding='latin1').read().split('\n'); i=0; mats=[]; objs=[]
    def nxt():
        nonlocal i
        while i<len(L) and not L[i].strip(): i+=1
        s=L[i]; i+=1; return s
    hdr=nxt()
    def obj(M,loc,prefix):
        o={'name':'','tex':None,'rot':np.eye(3),'loc':np.zeros(3),'v':None,'tris':[],'mat':[]}
        while True:
            s=nxt().strip(); t=s.split()
            if t[0]=='name': o['name']=s.split('"')[1] if '"' in s else t[1]
            elif t[0]=='data': n=int(t[1]); nxt()
            elif t[0]=='texture': o['tex']=s.split('"')[1]
            elif t[0]=='rot': o['rot']=np.array(list(map(float,t[1:10]))).reshape(3,3)
            elif t[0]=='loc': o['loc']=np.array(list(map(float,t[1:4])))
            elif t[0]=='numvert':
                n=int(t[1]); o['v']=np.array([list(map(float,nxt().split()[:3])) for _ in range(n)])
            elif t[0]=='numsurf':
                for _ in range(int(t[1])):
                    fl=int(nxt().split()[1],0); mt=0; refs=[]
                    while True:
                        s2=nxt().split()
                        if s2[0]=='mat': mt=int(s2[1])
                        elif s2[0]=='refs':
                            refs=[nxt().split() for _ in range(int(s2[1]))]; break
                    if fl&0xF: continue
                    r=[(int(a[0]),float(a[1]),float(a[2])) for a in refs]
                    for k in range(1,len(r)-1): o['tris'].append((r[0],r[k],r[k+1])); o['mat'].append(mt)
            elif t[0]=='kids':
                Mn=M@o['rot']; locn=loc+M@o['loc']
                if o['v'] is not None and o['tris']:
                    objs.append({'name':o['name'],'tex':o['tex'],'v':(Mn@o['v'].T).T+locn,'tris':o['tris'],'mat':o['mat'],'path':prefix+'/'+o['name']})
                for _ in range(int(t[1])):
                    nxt(); obj(Mn,locn,prefix+'/'+o['name'])
                return
            elif t[0] in ('crease','texrep','texoff','url','subdiv','hidden','locked','folded'): pass
    while i<len(L):
        while i<len(L) and not L[i].strip(): i+=1
        if i>=len(L): break
        s=L[i].strip()
        if s.startswith('MATERIAL'):
            m=re.findall(r'[-\d.]+',s.split('"',2)[2]); mats.append({'name':s.split('"')[1],'rgb':list(map(float,m[0:3])),'trans':float(m[-1])}); i+=1
        elif s.startswith('OBJECT'): i+=1; obj(np.eye(3),np.zeros(3),'')
        else: i+=1
    return mats,objs
