# PostgREST embed (select ichidagi bog'langan jadval) noaniqligini tekshiradi: ikki jadval orasida bir nechta FK bo'lsa
# `profiles!attempts_student_id_fkey(...)` kabi aniq ko'rsatma SHART. Ishga tushirish: npm run test:rls dan keyin  python3 scripts/check-embeds.py
# (smartedu_test bazasidagi haqiqiy FK'lar bilan solishtiradi; TypeScript buni ko'rmaydi, PostgREST esa ish vaqtida xato beradi).
import re, subprocess, glob, collections
# 1) DB'dagi FK'lar: (child, parent) juftlari soni
q = """select c.relname, p.relname, count(*) from pg_constraint k
join pg_class c on c.oid=k.conrelid join pg_class p on p.oid=k.confrelid
join pg_namespace n on n.oid=c.relnamespace where k.contype='f' and n.nspname='public' group by 1,2"""
out = subprocess.run(['psql','postgresql://postgres:postgres@localhost:5432/smartedu_test','-At','-F','|','-c',q],capture_output=True,text=True).stdout
fk = collections.Counter()
for line in out.strip().splitlines():
    a,b,n = line.split('|'); fk[frozenset((a,b))] += int(n)
    fk[(a,b)] += int(n)
# 2) Manba: .from('T') ... .select('...') ichidagi embedlar (qavsli nomlar)
bad = []
for path in glob.glob('src/**/*.ts*', recursive=True):
    src = open(path).read()
    for m in re.finditer(r"\.from\('(\w+)'\)(.{0,400}?)\.select\(\s*(['\"`])(.*?)\3", src, re.S):
        table, _, _, sel = m.groups()
        def parse(sel, parent):
            # sel ichidagi embed'larni (nom, ichki matn) sifatida ajratib, rekursiv tekshiradi
            i=0; depth=0; start=0; token=''; items=[]
            buf=''
            while i < len(sel):
                ch=sel[i]
                if ch=='(' and depth==0:
                    name=buf.split(',')[-1].strip(); buf=''; depth=1; start=i+1
                elif ch=='(':
                    depth+=1
                elif ch==')':
                    depth-=1
                    if depth==0: items.append((name, sel[start:i]))
                elif depth==0: buf+=ch
                i+=1
            for nm, inner in items:
                base = nm.split('!')[0].strip(); hint = '!' in nm and not nm.endswith('!inner')
                if base:
                    n = fk.get(frozenset((parent, base)), 0)
                    if n == 0 and base != parent: bad.append(('NO-FK', path, parent, nm))
                    elif n > 1 and not hint: bad.append(('AMBIGUOUS', path, parent, nm, n))
                    parse(inner, base)
        parse(sel, table)
for b in bad: print(b)
print('tekshirildi; muammo:', len(bad))
