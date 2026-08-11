"""Semantic shadow parity for auth, platform, and product durable domains."""
from __future__ import annotations
import json, sqlite3
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from writing_coach.persistence.ids import stable_uuid
from writing_coach.persistence.importer import Discovery
from writing_coach.persistence.models import User, Subscription, UsageEvent, PlatformSetting

def _rows(path, table):
    if not path: return []
    with sqlite3.connect(path) as conn:
        conn.row_factory=sqlite3.Row
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone(): return []
        return [dict(x) for x in conn.execute(f'SELECT * FROM "{table}"')]

def _time(value):
    if value is None or value == '': return None
    if isinstance(value, datetime): parsed=value
    else: parsed=datetime.fromisoformat(str(value).replace('Z','+00:00'))
    if parsed.tzinfo is None: parsed=parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()

def compare_domain_parity(engine, discovery: Discovery) -> dict[str, Any]:
    mismatches=[]
    auth=sorted((str(r.get('google_sub') or ''),str(r.get('email') or ''),str(r.get('name') or ''),str(r.get('role') or 'user')) for r in discovery.auth_users if r.get('google_sub'))
    with Session(engine) as s:
        auth_keys={x[0] for x in auth}; pg_auth=sorted((u.user_key,u.email,u.name,u.role) for u in s.scalars(select(User)).all() if u.user_key in auth_keys)
        source_sub=sorted((str(r.get('user_key') or ''),str(r.get('plan_id') or 'free'),str(r.get('status') or 'active'),str(r.get('provider') or ''),str(r.get('external_customer_id') or ''),str(r.get('external_subscription_id') or ''),_time(r.get('current_period_end'))) for r in _rows(discovery.product_db,'subscriptions'))
        users={u.id:u.user_key for u in s.scalars(select(User)).all()}
        target_sub=sorted((users.get(x.user_id,''),x.plan_id,x.status,x.provider,x.external_customer_id,x.external_subscription_id,_time(x.current_period_end)) for x in s.scalars(select(Subscription)).all())
        source_usage=sorted((str(r.get('user_key') or ''),str(r.get('feature') or ''),int(r.get('amount') or 0),str(r.get('request_id') or ''),_time(r.get('occurred_at'))) for r in _rows(discovery.product_db,'usage_events'))
        target_usage=sorted((users[x.user_id],x.feature,x.amount,x.request_id,_time(x.occurred_at)) for x in s.scalars(select(UsageEvent)).all())
        source_platform=sorted(("ai.active_selection",json.dumps({'provider':str(r.get('provider') or ''),'model':str(r.get('model') or '')},sort_keys=True)) for r in _rows(discovery.platform_db,'platform_ai_config'))
        target_platform=sorted((x.key,json.dumps(x.value,sort_keys=True)) for x in s.scalars(select(PlatformSetting)).all())
    for name,a,b in [('auth',auth,pg_auth),('subscriptions',source_sub,target_sub),('usage_events',source_usage,target_usage),('platform_settings',source_platform,target_platform)]:
        if a!=b: mismatches.append({'domain':name,'sqlite':a,'postgres':b})
    return {'ok':not mismatches,'mismatches':mismatches,'domains':['auth','platform','product']}
