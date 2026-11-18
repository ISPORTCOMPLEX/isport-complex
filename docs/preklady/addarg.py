import re,subprocess,sys
FN=sys.argv[1].split(',')
for it in range(5):
    out=subprocess.run(['/tmp/claude-0/-home-claude/fe8e5ff7-3b76-51fb-b6ee-f60670967014/scratchpad/tc/chk.sh'],capture_output=True,text=True).stdout
    done=0
    seen=set()
    for line in out.splitlines():
        m=re.match(r"(.+?)\((\d+),(\d+)\): error TS2554: Expected \d+(-\d+)? arguments, but got \d+\.",line)
        if not m: continue
        f,ln,col=m.group(1),int(m.group(2)),int(m.group(3))
        if (f,ln) in seen: continue
        L=open(f).read().split('\n'); src='\n'.join(L)
        name='tr' if re.search(r'const tr = (await getT|useT)',src) else 't'
        l=L[ln-1]; seg=l[col-1:]
        mm=re.match(r'(%s)\('%'|'.join(FN),seg)
        if not mm: print('??',f,ln,seg[:50]); continue
        i=col-1+len(mm.group(0)); depth=1
        while depth:
            c=l[i]; depth+= (c in '([{') - (c in ')]}'); i+=1
        L[ln-1]=l[:i-1]+', '+name+l[i-1:]
        open(f,'w').write('\n'.join(L)); done+=1; seen.add((f,ln))
    print('pass',it,done)
    if not done: break
