import numpy as np, json, struct, io, sys
from PIL import Image
sys.path.insert(0,__import__('os').path.dirname(__file__)); from ac import parse
# usage: python3 build206.py out.glb <path to svn export of fgaddon/trunk/Aircraft/Bell-206-JetRanger>
R=sys.argv[2].rstrip('/')+'/Models/'
NX=6.243; XN=-3.61; YG=-1.63
def to_app(v): return np.stack([NX-(v[:,0]-XN), v[:,1]-YG, -v[:,2]],1)
parts={}  # name -> dict(pos,uv,tex,kind)
def add(part,tex,P,UV):
    d=parts.setdefault(part,{'tex':tex,'P':[],'UV':[]}); d['P'].append(P); d['UV'].append(UV)
BODY={'fuselage','tail','vertstab','elevatortrim','leftdoor1','leftdoor2','rightdoor1','rightdoor2','trous','caches','clapet','grip'}
SKIP=lambda n:n.startswith('HDR')
def take(path,xf,classify,texdir):
    mats,objs=parse(path)
    for o in objs:
        if SKIP(o['name']): continue
        v=xf(o['v'])
        for (a,b,c),mt in zip(o['tris'],o['mat']):
            part=classify(o['name'],mats[mt] if mt<len(mats) else mats[0])
            if not part: continue
            P=v[[a[0],b[0],c[0]]]; UV=np.array([[a[1],1-a[2]],[b[1],1-b[2]],[c[1],1-c[2]]])
            add(part,texdir+(o['tex'] or ''),P,UV)
def cls_main(n,m):
    if m['trans']>0.3: return 'glass'
    if n in BODY or 'hinge' in n: return 'body'
    if n.startswith('skids'): return 'skids'
    return 'detail'
take(R+'jetranger.ac',to_app,cls_main,R)
take(R+'Interior/interior.ac',to_app,lambda n,m: None if m['trans']>0.3 else 'interior',R+'Interior/')
take(R+'Interior/Panel/panel.ac',lambda v:to_app(np.stack([v[:,0]*np.cos(np.radians(8))-v[:,1]*np.sin(np.radians(8)),v[:,0]*np.sin(np.radians(8))+v[:,1]*np.cos(np.radians(8)),v[:,2]],1)+np.array([-2.71471,-0.46085,0])),lambda n,m: None if m['trans']>0.3 else 'panel',R+'Interior/Panel/')
# main rotor: hub at FG (-0.811,0,1.068) -> AC (x,y_up,z)=(-0.811,1.068,0)
H=np.array([-0.811,1.068,0.0])
take(R+'Externals/MainRotor/mainrotor.ac',lambda v:to_app(v+H),lambda n,m:'mrhub',R+'Externals/MainRotor/')
for hd in (0,180):
    c,s=np.cos(np.radians(hd)),np.sin(np.radians(hd))
    def xf(v,c=c,s=s): w=v.copy(); w[:,1]+=0.26; x=w[:,0]*c-w[:,2]*s; z=w[:,0]*s+w[:,2]*c; w[:,0]=x; w[:,2]=z; return to_app(w+H)
    take(R+'Externals/MainRotor/blade.ac',xf,lambda n,m: None if (m['trans']>0.3 or n.startswith('prop')) else ('mrblade' if n.startswith('blade') else 'mrhub'),R+'Externals/MainRotor/')
# tail rotor: FG offset (5.15,-0.235,0.048) roll 90 -> AC (5.15,0.048,+0.235); rotor-local y (axis) -> AC +z (outboard, left)
T=np.array([5.15,0.048,0.235])
def tr(v,dy=0.0): w=np.stack([v[:,0],-v[:,2],v[:,1]+dy],1); return to_app(w+T)
take(R+'Externals/TailRotor/tailrotor.ac',tr,lambda n,m:'trhub',R+'Externals/TailRotor/')
for hd in (0,180):
    c,s=np.cos(np.radians(hd)),np.sin(np.radians(hd))
    def xf(v,c=c,s=s): w=v.copy(); x=w[:,0]*c-w[:,2]*s; z=w[:,0]*s+w[:,2]*c; w[:,0]=x; w[:,2]=z; return tr(w,0.098)
    take(R+'Externals/TailRotor/blade.ac',xf,lambda n,m: None if (m['trans']>0.3 or n.startswith('prop')) else 'trblade',R+'Externals/TailRotor/')
# ---- textures
def body_detail(src):
    im=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)/255
    mx=im.max(2); mn=im.min(2); sat=(mx-mn)/(mx+1e-4); lum=im@[0.3,0.59,0.11]
    from scipy.ndimage import binary_dilation
    m=binary_dilation(sat>0.22,iterations=max(2,lum.shape[0]//400)); from scipy.ndimage import gaussian_filter
    k=(~m).astype(np.float32); fill=gaussian_filter(lum*k,12)/(gaussian_filter(k,12)+1e-4); fill=np.where(gaussian_filter(k,12)>0.02,fill,0.86); det=np.where(m,fill,lum); H,W=lum.shape; bar=np.zeros_like(det,bool); bar[int(H*.50):int(H*.665),:int(W*.45)]=True; det=np.where(bar&(lum<0.35),0.86,det); det[int(H*.36):int(H*.50),int(W*.39):int(W*.62)]=0.86; det=np.clip(det/0.86,0,1.15)/1.15  # neutral paint = 1/1.15
    out=Image.fromarray((det*255).astype(np.uint8),'L')
    # cowl intake grilles: the photo strips read like stray lettering; replace with soft neutral louvre shading
    from PIL import ImageFilter
    box=(int(W*.69),int(H*.46),int(W*.975),int(H*.60)); g=out.crop(box).filter(ImageFilter.GaussianBlur(W/170)); out.paste(g,box)
    return out.convert('RGB')
def jpg(im,q=88,size=None):
    if size: im=im.resize((size,size),Image.LANCZOS)
    b=io.BytesIO(); im.convert('RGB').save(b,'JPEG',quality=q); return b.getvalue(),'image/jpeg'
# ---- smooth normals with crease
def normals(P,crease=40):
    f=np.cross(P[:,1]-P[:,0],P[:,2]-P[:,0]); f/=np.linalg.norm(f,axis=1,keepdims=True)+1e-12
    V=P.reshape(-1,3); key=np.round(V*2000).astype(np.int64); _,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.reshape(-1)
    fn=np.repeat(f,3,0); acc=np.zeros((inv.max()+1,3)); np.add.at(acc,inv,fn); vn=acc[inv]; vn/=np.linalg.norm(vn,axis=1,keepdims=True)+1e-12
    ok=(vn*fn).sum(1)>np.cos(np.radians(crease)); return np.where(ok[:,None],vn,fn).astype(np.float32)
# ---- glb
bins=[];views=[];acc=[];meshes=[];nodes=[];mats=[];texs=[];imgs=[]
def bv(data,target=None):
    off=sum(len(b) for b in bins); pad=(-len(data))%4; bins.append(data+b'\0'*pad); views.append({'buffer':0,'byteOffset':off,'byteLength':len(data),**({'target':target} if target else {})}); return len(views)-1
def accessor(arr,typ):
    arr=np.ascontiguousarray(arr,np.float32); v=bv(arr.tobytes(),34962); acc.append({'bufferView':v,'componentType':5126,'count':len(arr),'type':typ,**({'min':arr.min(0).tolist(),'max':arr.max(0).tolist()} if typ=='VEC3' else {})}); return len(acc)-1
texcache={}
def texture(src,kind):
    k=(src,kind)
    if k in texcache: return texcache[k]
    if kind=='body': data,mime=jpg(body_detail(src),90)
    else:
        im=Image.open(src).convert('RGB')
        if src.endswith('Models/texture.png'):  # tail-skid hazard stripes -> plain grey
            W,H=im.size; im.paste((150,150,150),(int(W*.88),int(H*.68),int(W*.985),int(H*.74)))
        data,mime=jpg(im,85,1024 if im.size[0]>1024 else None)
    imgs.append({'bufferView':bv(data),'mimeType':mime}); texs.append({'source':len(imgs)-1}); texcache[k]=len(texs)-1; return texcache[k]
for name,d in parts.items():
    P=np.stack(d['P']); UV=np.stack(d['UV'])
    if name in ('glass',): mat={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[0.55,0.62,0.66,0.35],'metallicFactor':0,'roughnessFactor':0.05},'alphaMode':'BLEND','doubleSided':True}
    else: mat={'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':texture(d['tex'],'body' if name=='body' else name)},'metallicFactor':0,'roughnessFactor':0.6},'doubleSided':name in ('interior','panel','mrblade','trblade','skids')}
    mats.append(mat)
    N=normals(P); prim={'attributes':{'POSITION':accessor(P.reshape(-1,3),'VEC3'),'NORMAL':accessor(N,'VEC3'),'TEXCOORD_0':accessor(UV.reshape(-1,2),'VEC2')},'material':len(mats)-1}
    meshes.append({'name':name,'primitives':[prim]}); nodes.append({'name':name,'mesh':len(meshes)-1})
    print(name,len(P),'tris', np.round(P.reshape(-1,3).min(0),2),np.round(P.reshape(-1,3).max(0),2))
blob=b''.join(bins)
G={'asset':{'version':'2.0','generator':'build206.py (from FlightGear Bell-206-JetRanger, GPL-2.0)','copyright':'Bell 206 JetRanger 3D model by MOJO and Emmanuel BARANGER (helijah), FlightGear FGAddon, GPL-2.0-or-later; converted to glTF'},
   'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':mats,'textures':texs,'images':imgs,'samplers':[],'accessors':acc,'bufferViews':views,'buffers':[{'byteLength':len(blob)}]}
for t in texs: t['sampler']=0
G['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
js=json.dumps(G).encode(); js+=b' '*((-len(js))%4)
out=sys.argv[1]
with open(out,'wb') as f:
    f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(blob))); f.write(struct.pack('<II',len(js),0x4E4F534A)); f.write(js); f.write(struct.pack('<II',len(blob),0x004E4942)); f.write(blob)
import os; print(out,os.path.getsize(out)//1024,'KB')
