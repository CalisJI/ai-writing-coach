from __future__ import annotations
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from writing_coach.persistence.config import create_shadow_engine,shadow_url
from writing_coach.persistence.importer import discover_sources
from writing_coach.persistence.cutover_verification import compare_domain_parity
p=argparse.ArgumentParser();p.add_argument('--data-root',default='/data');p.add_argument('--url',default='');a=p.parse_args()
r=compare_domain_parity(create_shadow_engine(a.url or shadow_url()),discover_sources(Path(a.data_root)))
print(json.dumps(r,ensure_ascii=False,indent=2))
if not r['ok']: raise SystemExit('Auth/platform/product semantic parity FAILED')
print('Auth/platform/product semantic parity: PASS')
