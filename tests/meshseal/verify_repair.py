#!/usr/bin/env python3
"""CLI regression: repair an open cube STL and verify 2-manifold closed output."""
import math, os, struct, subprocess, sys, tempfile
from collections import Counter
from pathlib import Path

def write_stl(path, triangles):
    with open(path,"wb") as f:
        f.write(b"ExpressArte defective cube".ljust(80,b" "))
        f.write(struct.pack("<I",len(triangles)))
        for tri in triangles:
            f.write(struct.pack("<12fH",0,0,0,*tri[0],*tri[1],*tri[2],0))

def parse_stl(path):
    data=Path(path).read_bytes()
    if len(data)<84: raise AssertionError("output invalid: too short")
    n=struct.unpack_from("<I",data,80)[0]
    if 84+n*50!=len(data): raise AssertionError("output invalid: STL size")
    tris=[]
    for i in range(n):
        vals=struct.unpack_from("<12fH",data,84+i*50)
        pts=[vals[3:6],vals[6:9],vals[9:12]]
        if not all(math.isfinite(v) for p in pts for v in p): raise AssertionError("non-finite coordinates")
        tris.append(pts)
    return tris

def diagnose(tris):
    edges=Counter()
    for tri in tris:
        keys=[tuple(round(x,5) for x in p) for p in tri]
        for i in range(3):
            k=tuple(sorted((keys[i],keys[(i+1)%3])))
            edges[k]+=1
    return sum(v==1 for v in edges.values()),sum(v>2 for v in edges.values())

p=[(-10,-10,-10),(10,-10,-10),(10,10,-10),(-10,10,-10),(-10,-10,10),(10,-10,10),(10,10,10),(-10,10,10)]
# Five faces only: the top (indices 4,5,6,7) is missing.
quads=[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
triangles=[]
for a,b,c,d in quads:triangles.extend([(p[a],p[b],p[c]),(p[a],p[c],p[d])])
assert diagnose(triangles)[0]==4
cli=sys.argv[1] if len(sys.argv)>1 else os.environ.get("MESHSEAL_CLI","meshseal_cli")
with tempfile.TemporaryDirectory() as tmp:
    input_path=Path(tmp)/"cube-open.stl";output_path=Path(tmp)/"cube-fixed.stl"
    write_stl(input_path,triangles)
    cp=subprocess.run([cli,str(input_path),str(output_path)],capture_output=True,text=True,timeout=120)
    print(cp.stdout[-800:]);print(cp.stderr[-800:])
    if cp.returncode:raise AssertionError(f"Meshseal CLI exit {cp.returncode}")
    fixed=parse_stl(output_path)
    open_edges,bad_edges=diagnose(fixed)
    if not fixed or open_edges or bad_edges:
        raise AssertionError(f"Meshseal output not closed: faces={len(fixed)} open={open_edges} nonmanifold={bad_edges}")
    max_abs=max(abs(v) for t in fixed for p in t for v in p)
    if not 1<=max_abs<=50:raise AssertionError("Unexpected dimension change")
    print(f"PASS: repaired open cube; triangles={len(fixed)}; boundary={open_edges}; nonmanifold={bad_edges}")
