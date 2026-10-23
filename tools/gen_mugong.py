# 1a 무공 데이터 생성: design/tools/mugong_v061.py + 기획서 v0.7.8 부록 C(이름) + 16-10-3(qi) → js/mugong_data.js
import sys, json, re, os
DES = '/workspace/projects/murim/design'
sys.path.insert(0, DES + '/tools'); sys.dont_write_bytecode = True
import mugong_v061 as M
doc = open(DES + '/기획서_v0.7.8.md', encoding='utf-8').read().split('\n')
# 부록 C
i0 = next(i for i, l in enumerate(doc) if l.startswith('## 부록 C'))
ren = {}
for l in doc[i0:i0 + 60]:
    c = [x.strip() for x in l.split('|')]
    if len(c) > 5 and c[2] and c[3].startswith('**'):
        ren[c[2]] = (c[3].strip('*'), c[4])
# 16-10-3
j0 = next(i for i, l in enumerate(doc) if l.startswith('#### 16-10-3'))
qi = {}; nm16 = {}
for l in doc[j0:j0 + 60]:
    c = [x.strip() for x in l.split('|')]
    if len(c) > 10 and c[2].startswith('`'):
        qi[c[2].strip('`')] = int(c[9].strip('*')); nm16[c[2].strip('`')] = c[3]
assert len(qi) == 48, len(qi)
def R(n, h):
    return ren.get(n, (n, h))
MG = {}
for k, m in M.MG.items():
    n, h = R(m['name'], m['hanja']); o = dict(name=n, hanja=h, cat=m['cat'], tend=m['tend'], grade=m['grade'], src=m['src'], desc=m['desc'])
    if 'wpn' in m: o['wpn'] = m['wpn']
    if 'pas' in m: o['pas'] = m['pas']
    if 'mil' in m: o['mil'] = {str(a): list(b) for a, b in m['mil'].items()}
    if m.get('risk'): o['risk'] = True
    if 'moves' in m:
        o['moves'] = []
        for x in m['moves']:
            mn, mh = R(x['name'], x['hanja'])
            assert mn == nm16[x['id']], (x['id'], mn, nm16[x['id']])
            o['moves'].append(dict(id=x['id'], name=mn, hanja=mh, kind=x['kind'], seong=x['seong'], coef=x['coef'], hits=x['hits'], eff=[list(e) for e in x['eff']], desc=x['desc'], qi=qi[x['id']]))
    MG[k] = o
DAN = {}
for k, d in M.DANCHO.items():
    n, h = R(d['name'], d['hanja']); assert n == nm16[k], (k, n)
    DAN[k] = dict(f=d['f'], mg=d['mg'], name=n, hanja=h, src=d['src'], coef=d['coef'], hits=d['hits'], eff=[list(e) for e in d['eff']], desc=d['desc'], qi=qi[k])
ES = {}
for k, e in M.ESET.items():
    mg, mh = R(e['mg'], e['hanja']); kn = R(e['kill'][0], '')[0]
    ES[k] = dict(f=e['f'], mg=mg, hanja=mh, tend=e['tend'], mode=e['mode'], moves=e['moves'], kill=[kn, e['kill'][1]])
out = '// 자동 생성: tools/gen_mugong.py (mugong_v061.py + 기획서 v0.7.8 부록 C 이름 + 16-10-3 진기). 손으로 고치지 말 것.\n(function (D) {\n'
for nm, v in (('MG', MG), ('DANCHO', DAN), ('ESET', ES), ('REG_SET', M.REG_SET), ('GENERIC', {k: list(v) for k, v in M.GENERIC.items()}), ('MGBASE', M.GBASE), ('NEED_S', M.NEED_S), ('GMUL', M.GMUL), ('MCAP', M.CAP), ('MSLOTS', M.SLOTS), ('BEATS', M.BEATS), ('MGAIN', M.GAIN)):
    out += 'D.' + nm + ' = ' + json.dumps(v, ensure_ascii=False) + ';\n'
out += 'D.HEAL_MAX = %d; D.ADAPT_N = %d; D.ADAPT_S = %d; D.WIN_K = %s; D.ADV = %s;\n' % (M.HEAL_MAX, M.ADAPT_N, M.ADAPT_S, M.WIN_K, M.ADV)
out += "})(typeof window !== 'undefined' ? window.D : require('./data.js'));\n"
open(os.path.join(os.path.dirname(__file__), '..', 'js', 'mugong_data.js'), 'w').write(out)
print('ok', len(MG), sum(len(m.get('moves', [])) for m in MG.values()), len(DAN), len(ren))
