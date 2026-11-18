import json,sys,subprocess,re
k=json.load(open('/tmp/claude-0/-home-claude/fe8e5ff7-3b76-51fb-b6ee-f60670967014/scratchpad/i18n/keys.json'))
a,b=int(sys.argv[1]),int(sys.argv[2])
for i in range(a,min(b,len(k))):
    x=k[i]
    frag = not re.match(r'^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ0-9+{%(]',x) or (re.search(r'[a-záäčďéíĺľňóôŕšťúýž]$',x) and ' ' in x and len(x)>12)
    print(f"{i} {x!r}"[:400])
    if frag:
        needle=x.replace('\\','\\\\').replace("'","\\'").replace('\n','\\n')
        r=subprocess.run(['grep','-rnF','--include=*.tsx','--include=*.ts',"'"+needle+"'",'app','components','lib'],cwd='/home/claude/isport-complex',capture_output=True,text=True).stdout.split('\n')[0]
        if r:
            f,ln=r.split(':')[0],int(r.split(':')[1])
            L=open('/home/claude/isport-complex/'+f).read().split('\n')
            ctx=' '.join(l.strip() for l in L[max(0,ln-3):ln+2])
            print('    CTX:', re.sub(r'\s+',' ',ctx)[:420])
